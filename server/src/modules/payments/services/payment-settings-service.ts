import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  DonationPaymentMethod,
  PaymentGatewayMode,
  PaymentMethodVerification,
} from '../../../infastructures/prisma/common/client';
import type { XenditCredentials } from '../../../infastructures/xendit/xendit-service';
import {
  PAYMENT_METHOD_CATALOG,
  paymentMethodDescriptor,
} from '../../../shared/constants/payment-methods';
import { decryptSecret } from '../../../shared/utils/secret-cipher-utils';
import {
  DONATION_MAX_AMOUNT,
  DONATION_MIN_AMOUNT,
} from '../../donations/validators/donations-mobile-validator';
import {
  PaymentsRepository,
  type PaymentSettingsRow,
} from '../repositories/payments-repository';

/** One channel with every "unset" already resolved to the value that applies. */
export interface PaymentChannelConfig {
  method: DonationPaymentMethod;
  enabled: boolean;
  label: string;
  description: string;
  accountName: string | null;
  accountNumber: string | null;
  channelCodes: readonly string[];
  minAmount: number;
  maxAmount: number;
  sortOrder: number;
  /** Where the channel stands with the gateway — see `PaymentActivationService`. */
  verification: PaymentMethodVerification;
  /**
   * Whether a donor may be offered this channel: on, and not one the gateway has
   * refused. PENDING still counts — nothing can be charged without credentials
   * anyway, and a channel must not vanish from the portal's promise the moment the
   * account is connected but not yet checked.
   */
  offerable: boolean;
}

/** What the donations module needs to know to open a checkout. */
export interface PaymentGatewayConfig {
  mode: PaymentGatewayMode;
  /** The director's master switch. */
  enabled: boolean;
  /** Null when no key is stored and none is in the environment either. */
  credentials: XenditCredentials | null;
  /** True while the key in use came from `XENDIT_SECRET_KEY` rather than the portal. */
  usingEnvCredentials: boolean;
  /**
   * Whether the key in use is a Xendit *development* key. Read off the key itself
   * rather than off `mode`, which is only a label the director picks — a live key must
   * never be treated as a sandbox one because someone left the dropdown on Test.
   */
  sandbox: boolean;
  webhookToken: string | null;
  statementName: string | null;
  supportEmail: string | null;
  supportContact: string | null;
  methods: PaymentChannelConfig[];
}

/**
 * How long one API instance may serve a cached copy of the gateway config. Every
 * checkout reads it, so it is not fetched per request — but it is held in process
 * memory rather than in Redis on purpose: the resolved config carries the decrypted
 * secret key, which has no business being written to a shared cache. A save clears
 * the copy on the instance that handled it; another instance follows within the TTL.
 */
const CONFIG_TTL_MS = 60_000;

/**
 * The single source of truth for "can CARES take money right now, through which
 * channel, into whose account". The portal writes it (`PaymentsSiteService`), the
 * donations module reads it, and nothing else touches the stored credentials.
 */
@Injectable()
export class PaymentSettingsService {
  private readonly logger = new Logger(PaymentSettingsService.name);
  private cache: { config: PaymentGatewayConfig; expiresAt: number } | null =
    null;

  constructor(private readonly paymentsRepository: PaymentsRepository) {}

  /**
   * Never throws: a database blip must not take donations down in a way that looks
   * like a misconfiguration. It falls back to the environment key with every channel
   * open — which is exactly how the module behaved before it was configurable.
   */
  async getConfig(): Promise<PaymentGatewayConfig> {
    if (this.cache && this.cache.expiresAt > Date.now()) {
      return this.cache.config;
    }

    let config: PaymentGatewayConfig;
    try {
      config = this.toConfig(await this.paymentsRepository.findSettings());
    } catch (error) {
      this.logger.error(
        'Falling back to the environment payment credentials',
        error instanceof Error ? error.stack : undefined,
      );
      config = this.toConfig(null);
    }

    this.cache = { config, expiresAt: Date.now() + CONFIG_TTL_MS };
    return config;
  }

  /** Dropped after a save so the next checkout reads the new credentials. */
  invalidate(): void {
    this.cache = null;
  }

  /** The token a Xendit callback must carry, or null when none is configured. */
  async callbackToken(): Promise<string | null> {
    return (await this.getConfig()).webhookToken;
  }

  /**
   * The credentials and channel a checkout may use, or a 400 explaining why not. The
   * refusals here are the server half of what the portal shows the donor: a method the
   * director never enabled must not become payable by posting its name directly.
   */
  async resolveCheckout(
    method: DonationPaymentMethod,
    amount: number,
  ): Promise<{
    credentials: XenditCredentials;
    channel: PaymentChannelConfig;
    config: PaymentGatewayConfig;
  }> {
    const config = await this.getConfig();
    if (!config.enabled || !config.credentials) {
      throw new BadRequestException(
        'Online donations are not being accepted right now',
      );
    }

    const channel = config.methods.find((entry) => entry.method === method);
    if (!channel || !channel.offerable) {
      throw new BadRequestException(
        'That payment method is not available for CARES donations',
      );
    }
    if (amount < channel.minAmount) {
      throw new BadRequestException(
        `${channel.label} donations start at ₱${channel.minAmount.toLocaleString('en-PH')}`,
      );
    }
    if (amount > channel.maxAmount) {
      throw new BadRequestException(
        `${channel.label} donations are capped at ₱${channel.maxAmount.toLocaleString('en-PH')}`,
      );
    }

    return { credentials: config.credentials, channel, config };
  }

  /**
   * Reading a settled payment back does not go through `resolveCheckout`: a row opened
   * while a channel was enabled still has to be reconciled after the director switches
   * it off, so only the credentials are required here.
   */
  async credentialsOrNull(): Promise<XenditCredentials | null> {
    return (await this.getConfig()).credentials;
  }

  /**
   * Turns the stored row — or the absence of one — into the resolved config. With no
   * row, every channel is on and the environment key is used, so an install that
   * never opens the Payments module keeps working.
   */
  private toConfig(row: PaymentSettingsRow | null): PaymentGatewayConfig {
    const storedKey = decryptSecret(row?.secret_key_cipher);
    const envKey = process.env.XENDIT_SECRET_KEY?.trim() || null;
    const secretKey = storedKey ?? envKey;
    const apiUrl =
      row?.api_url?.trim() || process.env.XENDIT_API_URL?.trim() || null;

    const storedToken = decryptSecret(row?.webhook_token_cipher);
    const envToken = process.env.XENDIT_WEBHOOK_TOKEN?.trim() || null;

    if (row?.secret_key_cipher && !storedKey) {
      // The row was written under a different CREDENTIAL_ENCRYPTION_KEY. Saying so is
      // the only way the director can tell this from "no key saved".
      this.logger.error(
        'The stored Xendit secret key could not be decrypted — check CREDENTIAL_ENCRYPTION_KEY',
      );
    }

    return {
      mode: row?.mode ?? PaymentGatewayMode.TEST,
      // No row means "as it was before the module existed": on when a key exists.
      enabled: row ? row.enabled : Boolean(secretKey),
      credentials: secretKey ? { secretKey, apiUrl } : null,
      usingEnvCredentials: !storedKey && Boolean(envKey),
      sandbox: (secretKey ?? '').includes('_development_'),
      webhookToken: storedToken ?? envToken,
      statementName: row?.statement_name ?? null,
      supportEmail: row?.support_email ?? null,
      supportContact: row?.support_contact ?? null,
      methods: this.toChannels(row),
    };
  }

  private toChannels(row: PaymentSettingsRow | null): PaymentChannelConfig[] {
    return PAYMENT_METHOD_CATALOG.map((descriptor) => {
      const saved = row?.methods.find(
        (entry) => entry.method === descriptor.method,
      );

      return {
        method: descriptor.method,
        // A channel with no row yet follows the same rule as the settings row: open
        // before the director has said otherwise.
        enabled: saved ? saved.enabled : !row,
        label: saved?.display_name?.trim() || descriptor.label,
        description: saved?.instructions?.trim() || descriptor.description,
        accountName: saved?.account_name ?? null,
        accountNumber: saved?.account_number ?? null,
        channelCodes:
          saved && saved.channel_codes.length
            ? saved.channel_codes
            : descriptor.channelCodes,
        minAmount: saved?.min_amount || DONATION_MIN_AMOUNT,
        maxAmount: saved?.max_amount || DONATION_MAX_AMOUNT,
        sortOrder: saved?.sort_order ?? descriptor.sortOrder,
        verification:
          saved?.verification ?? PaymentMethodVerification.NOT_VERIFIED,
        offerable:
          (saved ? saved.enabled : !row) &&
          saved?.verification !== PaymentMethodVerification.FAILED,
      };
    }).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  /** The catalog copy for a channel, for callers that only need its defaults. */
  descriptorFor(method: DonationPaymentMethod) {
    return paymentMethodDescriptor(method);
  }
}
