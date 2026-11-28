import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  PaymentAccountProof,
  PaymentGatewayMode,
  PaymentMethodVerification,
  type DonationPaymentMethod,
} from '../../../infastructures/prisma/common/client';
import {
  XenditRequestError,
  XenditService,
} from '../../../infastructures/xendit/xendit-service';
import { PAYMENT_METHOD_CATALOG } from '../../../shared/constants/payment-methods';
import type { RequestContextDto } from '../../../shared/decorators/request-context-decorator';
import type { JwtPayload } from '../../../shared/types/jwt-payload';
import {
  encryptSecret,
  secretTail,
} from '../../../shared/utils/secret-cipher-utils';
import type { AuditLogChangeDto } from '../../audit-logs/dto/audit-logs-site-dto';
import { AuditLogRecorder } from '../../audit-logs/services/audit-log-recorder';
import type {
  PaymentSettingsDto,
  TestPaymentGatewayDto,
  UpdatePaymentSettingsDto,
} from '../dto/payments-site-dto';
import {
  PaymentsRepository,
  type PaymentMethodWrite,
  type PaymentSettingsRow,
} from '../repositories/payments-repository';
import {
  PAYMENT_AMOUNT_CEILING,
  PAYMENT_AMOUNT_FLOOR,
} from '../validators/payments-site-validator';
import { PaymentAccountProofService } from './payment-account-proof-service';
import { PaymentActivationService } from './payment-activation-service';
import { PaymentSettingsService } from './payment-settings-service';
import { apiPublicUrl } from '../../../shared/utils/environment-utils';

/** Read-only in the portal. */
const WEBHOOK_PATH = '/api/v1/donations/webhooks/xendit';

@Injectable()
export class PaymentsSiteService {
  private readonly logger = new Logger(PaymentsSiteService.name);

  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly paymentSettings: PaymentSettingsService,
    private readonly activation: PaymentActivationService,
    private readonly accountProof: PaymentAccountProofService,
    private readonly xendit: XenditService,
    private readonly auditLogRecorder: AuditLogRecorder,
  ) {}

  async getSettings(): Promise<PaymentSettingsDto> {
    return this.toDto(await this.paymentsRepository.findSettings());
  }

  /** An omitted secret keeps the stored one. */
  async updateSettings(
    body: UpdatePaymentSettingsDto,
    actor: JwtPayload,
    context: RequestContextDto = {},
  ): Promise<PaymentSettingsDto> {
    const previous = await this.paymentsRepository.findSettings();

    const row = await this.paymentsRepository.saveSettings(
      {
        mode: body.mode,
        enabled: body.enabled,
        api_url: body.api_url ?? null,
        statement_name: body.statement_name ?? null,
        support_email: body.support_email ?? null,
        support_contact: body.support_contact ?? null,
        ...this.secretWrites(body),
      },
      this.methodWrites(body),
      actor.sub,
    );

    // Dropped, not refreshed, so a failed write can't leave stale credentials.
    this.paymentSettings.invalidate();

    const changes = this.diff(previous, row, body);
    // Enabling a channel triggers its activation check.
    const activated = await this.activatePending(row);
    await this.auditLogRecorder.record({
      action: 'payment-settings.updated',
      description: changes.length
        ? `Updated the donation payment settings (${changes.length} change${changes.length === 1 ? '' : 's'})`
        : 'Saved the donation payment settings with no changes',
      category: 'SYSTEM',
      // Decides where donor money lands.
      severity: 'NOTICE',
      actor,
      targetType: 'system',
      targetLabel: 'Donation payment settings',
      targetId: row.payment_gateway_settings_id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      changes,
    });

    return this.toDto(activated);
  }

  /** "Check again"; creates the settings row if needed. */
  async verifyMethod(
    method: DonationPaymentMethod,
    actor: JwtPayload,
  ): Promise<PaymentSettingsDto> {
    const row =
      (await this.paymentsRepository.findSettings()) ??
      (await this.paymentsRepository.ensureSettings(
        this.blankMethodWrites(),
        actor.sub,
      ));

    return this.toDto(await this.recheckMethod(row, method));
  }

  private async recheckMethod(
    row: PaymentSettingsRow,
    method: DonationPaymentMethod,
  ): Promise<PaymentSettingsRow> {
    const config = await this.paymentSettings.getConfig();
    const saved = row.methods.find((entry) => entry.method === method);
    const verdict = await this.activation.verify(
      method,
      config.credentials,
      this.webhookUrl(),
      {
        accountNumber: saved?.account_number ?? null,
        accountName: saved?.account_name ?? null,
        channelCodes: saved?.channel_codes ?? [],
        proven: saved?.account_proof === PaymentAccountProof.VERIFIED,
      },
    );

    return this.paymentsRepository.recordMethodVerification(
      row.payment_gateway_settings_id,
      method,
      verdict,
    );
  }

  /** Random amount, not returned: reporting it back is the proof. */
  async startAccountProof(
    method: DonationPaymentMethod,
    actor: JwtPayload,
  ): Promise<PaymentSettingsDto> {
    const { row, saved } = await this.requireMethod(method, actor);
    const config = await this.paymentSettings.getConfig();

    const proof = await this.accountProof.start(method, config.credentials, {
      accountNumber: saved?.account_number ?? null,
      accountName: saved?.account_name ?? null,
      channelCodes: saved?.channel_codes ?? [],
    });

    return this.toDto(
      await this.paymentsRepository.recordAccountProof(
        row.payment_gateway_settings_id,
        method,
        proof,
      ),
    );
  }

  /** A match verifies the account. */
  async confirmAccountProof(
    method: DonationPaymentMethod,
    amount: number,
    actor: JwtPayload,
  ): Promise<PaymentSettingsDto> {
    const { row, saved } = await this.requireMethod(method, actor);
    if (!saved) {
      throw new BadRequestException('That payment method is not set up yet');
    }

    const proof = this.accountProof.confirm(saved, amount);
    const updated = await this.paymentsRepository.recordAccountProof(
      row.payment_gateway_settings_id,
      method,
      proof,
    );

    if (proof.account_proof !== PaymentAccountProof.VERIFIED) {
      return this.toDto(updated);
    }

    await this.auditLogRecorder.record({
      action: 'payment-settings.account-verified',
      description: `Verified the ${method} receiving account with a test payout`,
      category: 'SYSTEM',
      severity: 'NOTICE',
      actor,
      targetType: 'system',
      targetLabel: 'Donation payment settings',
      targetId: row.payment_gateway_settings_id,
    });

    // The proof was the last PENDING blocker, so re-check now.
    return this.toDto(await this.recheckMethod(updated, method));
  }

  /** Created on first touch. */
  private async requireMethod(
    method: DonationPaymentMethod,
    actor: JwtPayload,
  ) {
    const row =
      (await this.paymentsRepository.findSettings()) ??
      (await this.paymentsRepository.ensureSettings(
        this.blankMethodWrites(),
        actor.sub,
      ));

    return {
      row,
      saved: row.methods.find((entry) => entry.method === method),
    };
  }

  /** Already-passed channels are skipped to save a gateway round trip. */
  private async activatePending(
    row: PaymentSettingsRow,
  ): Promise<PaymentSettingsRow> {
    const config = await this.paymentSettings.getConfig();
    const pending = row.methods.filter(
      (entry) =>
        entry.enabled &&
        entry.verification !== PaymentMethodVerification.VERIFIED,
    );

    let current = row;
    for (const entry of pending) {
      const verdict = await this.activation.verify(
        entry.method,
        config.credentials,
        this.webhookUrl(),
        {
          accountNumber: entry.account_number,
          accountName: entry.account_name,
          channelCodes: entry.channel_codes,
          proven: entry.account_proof === PaymentAccountProof.VERIFIED,
        },
      );
      current = await this.paymentsRepository.recordMethodVerification(
        current.payment_gateway_settings_id,
        entry.method,
        verdict,
      );
    }

    return current;
  }

  private blankMethodWrites(): PaymentMethodWrite[] {
    return PAYMENT_METHOD_CATALOG.map((descriptor) => ({
      method: descriptor.method,
      enabled: false,
      display_name: null,
      instructions: null,
      account_name: null,
      account_number: null,
      channel_codes: [],
      min_amount: 0,
      max_amount: 0,
      sort_order: descriptor.sortOrder,
    }));
  }

  /** Balance lookup: the cheapest call that needs a valid key. Recorded on the row when present. */
  async testConnection(
    body: TestPaymentGatewayDto,
    actor: JwtPayload,
  ): Promise<PaymentSettingsDto> {
    const row = await this.paymentsRepository.findSettings();
    const config = await this.paymentSettings.getConfig();
    const triedKey = body.secret_key?.trim();
    const secretKey = triedKey || config.credentials?.secretKey;
    // A request URL only pairs with a request key, so the saved key can't be sent elsewhere.
    const apiUrl =
      (triedKey && body.api_url?.trim()) ||
      (config.credentials?.apiUrl ?? null);

    let failure: string | null = null;
    if (!secretKey) {
      failure = 'No secret key has been saved yet';
    } else {
      try {
        await this.xendit.getCashBalance({ secretKey, apiUrl });
      } catch (error) {
        failure =
          error instanceof XenditRequestError
            ? error.message
            : 'The payment gateway could not be reached';
        this.logger.warn(
          `Payment gateway test failed for ${actor.sub}: ${failure}`,
        );
      }
    }

    if (!row) {
      // No row to record on; the response carries the verdict.
      return { ...(await this.toDto(null)), verification_error: failure };
    }

    const updated = await this.paymentsRepository.recordVerification(
      row.payment_gateway_settings_id,
      failure,
    );
    return this.toDto(updated);
  }

  /** Undefined keeps, null clears, ciphertext replaces; `secret_key_last4` moves with the key. */
  private secretWrites(body: UpdatePaymentSettingsDto) {
    const writes: {
      secret_key_cipher?: string | null;
      secret_key_last4?: string | null;
      webhook_token_cipher?: string | null;
    } = {};

    if (body.secret_key !== undefined) {
      writes.secret_key_cipher = body.secret_key
        ? encryptSecret(body.secret_key)
        : null;
      writes.secret_key_last4 = body.secret_key
        ? secretTail(body.secret_key)
        : null;
    }
    if (body.webhook_token !== undefined) {
      writes.webhook_token_cipher = body.webhook_token
        ? encryptSecret(body.webhook_token)
        : null;
    }

    return writes;
  }

  /** Writes every catalog channel: missing means unticked. */
  private methodWrites(body: UpdatePaymentSettingsDto): PaymentMethodWrite[] {
    return PAYMENT_METHOD_CATALOG.map((descriptor) => {
      const sent = body.methods.find(
        (entry) => entry.method === descriptor.method,
      );

      return {
        method: descriptor.method,
        enabled: sent?.enabled ?? false,
        display_name: sent?.display_name ?? null,
        instructions: sent?.instructions ?? null,
        account_name: sent?.account_name ?? null,
        account_number: sent?.account_number ?? null,
        channel_codes: sent?.channel_codes ?? [],
        min_amount: sent?.min_amount ?? 0,
        max_amount: sent?.max_amount ?? 0,
        sort_order: descriptor.sortOrder,
        // Switching off drops the pass, so re-enabling re-checks.
        ...(sent?.enabled
          ? {}
          : {
              verification: PaymentMethodVerification.NOT_VERIFIED,
              verified_at: null,
              verification_message: null,
              verified_channel_codes: [],
              callbacks_registered_at: null,
            }),
      };
    });
  }

  private async toDto(
    row: PaymentSettingsRow | null,
  ): Promise<PaymentSettingsDto> {
    const config = await this.paymentSettings.getConfig();
    const usingEnvCredentials = !row?.secret_key_cipher && !!config.credentials;

    return {
      mode: row?.mode ?? PaymentGatewayMode.TEST,
      enabled: row?.enabled ?? false,
      secret_key_set: Boolean(row?.secret_key_cipher),
      secret_key_last4: row?.secret_key_last4 ?? null,
      webhook_token_set: Boolean(row?.webhook_token_cipher),
      using_env_credentials: usingEnvCredentials,
      api_url: row?.api_url ?? null,
      statement_name: row?.statement_name ?? null,
      support_email: row?.support_email ?? null,
      support_contact: row?.support_contact ?? null,
      webhook_url: this.webhookUrl(),
      verified_at: row?.verified_at?.toISOString() ?? null,
      verification_error: row?.verification_error ?? null,
      amount_floor: PAYMENT_AMOUNT_FLOOR,
      amount_ceiling: PAYMENT_AMOUNT_CEILING,
      methods: PAYMENT_METHOD_CATALOG.map((descriptor) => {
        const saved = row?.methods.find(
          (entry) => entry.method === descriptor.method,
        );

        return {
          method: descriptor.method,
          enabled: saved?.enabled ?? false,
          default_label: descriptor.label,
          display_name: saved?.display_name ?? null,
          instructions: saved?.instructions ?? null,
          account_name: saved?.account_name ?? null,
          account_number: saved?.account_number ?? null,
          channel_codes: saved?.channel_codes ?? [],
          available_channel_codes: [...descriptor.channelCodes],
          min_amount: saved?.min_amount ?? 0,
          max_amount: saved?.max_amount ?? 0,
          sort_order: descriptor.sortOrder,
          verification:
            saved?.verification ?? PaymentMethodVerification.NOT_VERIFIED,
          verified_at: saved?.verified_at?.toISOString() ?? null,
          verification_message: saved?.verification_message ?? null,
          verified_channel_codes: saved?.verified_channel_codes ?? [],
          callbacks_registered_at:
            saved?.callbacks_registered_at?.toISOString() ?? null,
          account_proof:
            saved?.account_proof ?? PaymentAccountProof.NOT_STARTED,
          account_proof_message: saved?.account_proof_message ?? null,
          account_proof_sent_at:
            saved?.account_proof_sent_at?.toISOString() ?? null,
          account_proof_attempts: saved?.account_proof_attempts ?? 0,
          account_verified_at:
            saved?.account_verified_at?.toISOString() ?? null,
          // Sandbox keys only.
          account_proof_sandbox_amount: config.sandbox
            ? (saved?.account_proof_amount ?? null)
            : null,
        };
      }),
      updated_by_user_id: row?.updated_by_user_id ?? null,
      updated_at: row?.updatedAt.toISOString() ?? null,
    };
  }

  private webhookUrl(): string {
    return `${apiPublicUrl()}${WEBHOOK_PATH}`;
  }

  /** Secrets reported only as changed, never their values. */
  private diff(
    previous: PaymentSettingsRow | null,
    next: PaymentSettingsRow,
    body: UpdatePaymentSettingsDto,
  ): AuditLogChangeDto[] {
    const changes: AuditLogChangeDto[] = [];
    type Loggable = string | number | boolean | string[] | null | undefined;
    const scalar = <T extends Loggable>(
      field: string,
      before: T | undefined,
      after: T,
    ): void => {
      const a = format(before);
      const b = format(after);
      if (a !== b) changes.push({ field, before: a, after: b });
    };

    scalar('mode', previous?.mode, next.mode);
    scalar('enabled', previous?.enabled, next.enabled);
    scalar('api_url', previous?.api_url, next.api_url);
    scalar('statement_name', previous?.statement_name, next.statement_name);
    scalar('support_email', previous?.support_email, next.support_email);
    scalar('support_contact', previous?.support_contact, next.support_contact);

    if (body.secret_key !== undefined) {
      changes.push({
        field: 'secret_key',
        before: previous?.secret_key_last4
          ? `•••• ${previous.secret_key_last4}`
          : 'none',
        after: next.secret_key_last4 ? `•••• ${next.secret_key_last4}` : 'none',
      });
    }
    if (body.webhook_token !== undefined) {
      changes.push({
        field: 'webhook_token',
        before: previous?.webhook_token_cipher ? 'set' : 'none',
        after: next.webhook_token_cipher ? 'set' : 'none',
      });
    }

    for (const descriptor of PAYMENT_METHOD_CATALOG) {
      const before = previous?.methods.find(
        (entry) => entry.method === descriptor.method,
      );
      const after = next.methods.find(
        (entry) => entry.method === descriptor.method,
      );
      if (!after) continue;

      scalar(`${descriptor.method}.enabled`, before?.enabled, after.enabled);
      scalar(
        `${descriptor.method}.account_number`,
        before?.account_number,
        after.account_number,
      );
      scalar(
        `${descriptor.method}.channel_codes`,
        before?.channel_codes,
        after.channel_codes,
      );
      scalar(
        `${descriptor.method}.min_amount`,
        before?.min_amount,
        after.min_amount,
      );
      scalar(
        `${descriptor.method}.max_amount`,
        before?.max_amount,
        after.max_amount,
      );
    }

    return changes;
  }
}

function format(
  value: string | number | boolean | string[] | null | undefined,
): string {
  if (value === null || value === undefined) return 'none';
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'none';
  return String(value);
}
