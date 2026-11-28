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

/** Defaults already resolved. */
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
  /** See `PaymentActivationService`. */
  verification: PaymentMethodVerification;
  /** On and not refused; PENDING still counts. */
  offerable: boolean;
}

export interface PaymentGatewayConfig {
  mode: PaymentGatewayMode;
  /** Master switch. */
  enabled: boolean;
  /** Null when no key is stored or in the environment. */
  credentials: XenditCredentials | null;
  /** Key came from `XENDIT_SECRET_KEY`, not the portal. */
  usingEnvCredentials: boolean;
  /** Read off the key itself, not the `mode` label. */
  sandbox: boolean;
  webhookToken: string | null;
  statementName: string | null;
  supportEmail: string | null;
  supportContact: string | null;
  methods: PaymentChannelConfig[];
}

/** In-process cache, not Redis: it holds the decrypted secret. Other instances catch up within the TTL. */
const CONFIG_TTL_MS = 60_000;

/** Single source of truth; only `PaymentsSiteService` writes the stored credentials. */
@Injectable()
export class PaymentSettingsService {
  private readonly logger = new Logger(PaymentSettingsService.name);
  private cache: { config: PaymentGatewayConfig; expiresAt: number } | null =
    null;

  constructor(private readonly paymentsRepository: PaymentsRepository) {}

  /** Never throws: on DB error, falls back to the env key with every channel open. */
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

  invalidate(): void {
    this.cache = null;
  }

  /** Null when none configured. */
  async callbackToken(): Promise<string | null> {
    return (await this.getConfig()).webhookToken;
  }

  /** Refuses methods the director never enabled, even if posted directly. */
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

  /** Credentials only: rows opened before a channel was disabled still reconcile. */
  async credentialsOrNull(): Promise<XenditCredentials | null> {
    return (await this.getConfig()).credentials;
  }

  /** No row: every channel on with the env key. */
  private toConfig(row: PaymentSettingsRow | null): PaymentGatewayConfig {
    const storedKey = decryptSecret(row?.secret_key_cipher);
    const envKey = process.env.XENDIT_SECRET_KEY?.trim() || null;
    const secretKey = storedKey ?? envKey;
    const apiUrl =
      row?.api_url?.trim() || process.env.XENDIT_API_URL?.trim() || null;

    const storedToken = decryptSecret(row?.webhook_token_cipher);
    const envToken = process.env.XENDIT_WEBHOOK_TOKEN?.trim() || null;

    if (row?.secret_key_cipher && !storedKey) {
      // Different CREDENTIAL_ENCRYPTION_KEY; distinguishes this from "no key saved".
      this.logger.error(
        'The stored Xendit secret key could not be decrypted — check CREDENTIAL_ENCRYPTION_KEY',
      );
    }

    return {
      mode: row?.mode ?? PaymentGatewayMode.TEST,
      // No row: on when a key exists.
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
        // No row yet: open by default.
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

  descriptorFor(method: DonationPaymentMethod) {
    return paymentMethodDescriptor(method);
  }
}
