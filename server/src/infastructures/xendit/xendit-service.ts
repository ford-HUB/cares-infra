import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';

/**
 * Owns each channel's Xendit product, callback shape and statuses:
 *   GCash       → eWallet Charges  POST /ewallets/charges  cb: ewallet.capture
 *   QRPh        → QR Codes         POST /qr_codes          cb: qr.payment
 *   Card / Bank → Invoices         POST /v2/invoices       cb: invoice paid/expired
 * Key prefix (`xnd_development_` / `xnd_production_`) picks the environment.
 * Credentials are passed per call (set in the portal via `PaymentSettingsService`).
 */
@Injectable()
export class XenditService {
  private readonly logger = new Logger(XenditService.name);

  /** Validates a secret key before saving ("Test connection"). */
  async getCashBalance(credentials: XenditCredentials): Promise<Balance> {
    return this.request<Balance>(
      credentials,
      'GET',
      '/balance?account_type=CASH',
    );
  }

  /** `x-callback-token` must match the saved token; constant-time compare. */
  isCallbackTokenValid(
    token: string | undefined,
    expected: string | null | undefined,
  ): boolean {
    const wanted = expected?.trim();
    if (!wanted || !token) return false;
    const a = Buffer.from(token);
    const b = Buffer.from(wanted);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  /** Token payout for the ownership check; needs Payouts enabled. `Idempotency-key` prevents duplicate sends. */
  async createPayout(
    credentials: XenditCredentials,
    input: {
      referenceId: string;
      channelCode: string;
      accountNumber: string;
      accountHolderName: string;
      amount: number;
      idempotencyKey: string;
    },
  ): Promise<Payout> {
    return this.request<Payout>(
      credentials,
      'POST',
      '/v2/payouts',
      {
        reference_id: input.referenceId,
        channel_code: input.channelCode,
        channel_properties: {
          account_number: input.accountNumber,
          account_holder_name: input.accountHolderName,
        },
        amount: input.amount,
        currency: 'PHP',
        description: 'CARES account verification',
      },
      { 'Idempotency-key': input.idempotencyKey },
    );
  }

  async getPayout(
    credentials: XenditCredentials,
    payoutId: string,
  ): Promise<Payout> {
    return this.request<Payout>(
      credentials,
      'GET',
      `/v2/payouts/${encodeURIComponent(payoutId)}`,
    );
  }

  /** Channels are activated by Xendit, not by API. Parsed defensively across endpoint generations. */
  async listPaymentChannels(
    credentials: XenditCredentials,
  ): Promise<PaymentChannel[]> {
    const payload = await this.request<unknown>(
      credentials,
      'GET',
      '/payment_channels',
    );
    const rows = Array.isArray(payload)
      ? payload
      : Array.isArray((payload as { data?: unknown })?.data)
        ? (payload as { data: unknown[] }).data
        : [];

    return rows.flatMap((row) => {
      if (!row || typeof row !== 'object') return [];
      const entry = row as Record<string, unknown>;
      const code = entry.channel_code ?? entry.channelCode ?? entry.code;
      if (typeof code !== 'string') return [];

      // Field differs by endpoint generation; unreadable means inactive.
      const status = entry.status ?? entry.channel_status;
      const activated =
        entry.is_activated === true ||
        entry.isActivated === true ||
        entry.is_enabled === true ||
        entry.isEnabled === true ||
        (typeof status === 'string' && status.toUpperCase() === 'ACTIVE');

      return [{ channelCode: code, activated }];
    });
  }

  /** Some accounts only allow dashboard setup, so a refusal is reported, not thrown. */
  async registerCallbackUrl(
    credentials: XenditCredentials,
    type: string,
    url: string,
  ): Promise<void> {
    await this.request(
      credentials,
      'POST',
      `/callback_urls/${encodeURIComponent(type)}`,
      { url },
    );
  }

  /** Settled by the `ewallet.capture` callback, not the redirect. */
  async createGcashCharge(
    credentials: XenditCredentials,
    input: {
      referenceId: string;
      amount: number;
      successRedirectUrl: string;
      failureRedirectUrl: string;
    },
  ): Promise<EwalletCharge> {
    return this.request<EwalletCharge>(
      credentials,
      'POST',
      '/ewallets/charges',
      {
        reference_id: input.referenceId,
        currency: 'PHP',
        amount: input.amount,
        checkout_method: 'ONE_TIME_PAYMENT',
        channel_code: 'PH_GCASH',
        channel_properties: {
          success_redirect_url: input.successRedirectUrl,
          failure_redirect_url: input.failureRedirectUrl,
        },
      },
    );
  }

  async getEwalletCharge(
    credentials: XenditCredentials,
    chargeId: string,
  ): Promise<EwalletCharge> {
    return this.request<EwalletCharge>(
      credentials,
      'GET',
      `/ewallets/charges/${encodeURIComponent(chargeId)}`,
    );
  }

  /** Settled by the `qr.payment` callback. */
  async createQrphCode(
    credentials: XenditCredentials,
    input: {
      referenceId: string;
      amount: number;
      expiresAt: Date;
    },
  ): Promise<QrCode> {
    return this.request<QrCode>(
      credentials,
      'POST',
      '/qr_codes',
      {
        reference_id: input.referenceId,
        type: 'DYNAMIC',
        currency: 'PHP',
        amount: input.amount,
        channel_code: 'QRPH',
        expires_at: input.expiresAt.toISOString(),
      },
      { 'api-version': QR_API_VERSION },
    );
  }

  async getQrCode(
    credentials: XenditCredentials,
    qrId: string,
  ): Promise<QrCode> {
    return this.request<QrCode>(
      credentials,
      'GET',
      `/qr_codes/${encodeURIComponent(qrId)}`,
      undefined,
      { 'api-version': QR_API_VERSION },
    );
  }

  /** Hosted checkout; the invoice callback (no `event` field) reports PAID / EXPIRED. */
  async createInvoice(
    credentials: XenditCredentials,
    input: {
      externalId: string;
      amount: number;
      description: string;
      payerEmail: string;
      paymentMethods: readonly string[];
      successRedirectUrl: string;
      failureRedirectUrl: string;
      durationSeconds: number;
    },
  ): Promise<Invoice> {
    return this.request<Invoice>(credentials, 'POST', '/v2/invoices', {
      external_id: input.externalId,
      amount: input.amount,
      currency: 'PHP',
      description: input.description,
      payer_email: input.payerEmail,
      payment_methods: [...input.paymentMethods],
      success_redirect_url: input.successRedirectUrl,
      failure_redirect_url: input.failureRedirectUrl,
      invoice_duration: input.durationSeconds,
    });
  }

  async getInvoice(
    credentials: XenditCredentials,
    invoiceId: string,
  ): Promise<Invoice> {
    return this.request<Invoice>(
      credentials,
      'GET',
      `/v2/invoices/${encodeURIComponent(invoiceId)}`,
    );
  }

  private async request<T>(
    credentials: XenditCredentials,
    method: 'GET' | 'POST',
    path: string,
    body?: Record<string, unknown>,
    extraHeaders: Record<string, string> = {},
  ): Promise<T> {
    const secretKey = credentials.secretKey?.trim();
    if (!secretKey) {
      throw new ServiceUnavailableException(
        'Online payments are not configured yet',
      );
    }
    const baseUrl = (credentials.apiUrl?.trim() || DEFAULT_API_URL).replace(
      /\/+$/,
      '',
    );
    const auth = Buffer.from(`${secretKey}:`).toString('base64');
    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
          ...extraHeaders,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (error) {
      this.logger.error(`Xendit ${method} ${path} unreachable`, error);
      throw new ServiceUnavailableException(
        'The payment gateway could not be reached. Please try again.',
      );
    }

    const payload = (await response.json().catch(() => ({}))) as
      | T
      | XenditErrorBody;
    if (!response.ok) {
      const err = payload as XenditErrorBody;
      this.logger.warn(
        `Xendit ${method} ${path} → ${response.status} ${err.error_code ?? ''} ${err.message ?? ''}`,
      );
      throw new XenditRequestError(
        response.status,
        err.error_code ?? 'UNKNOWN',
        err.message ?? 'The payment gateway rejected the request.',
      );
    }
    return payload as T;
  }
}

/** Pinned so callbacks arrive in the `qr.payment` shape. */
const QR_API_VERSION = '2022-07-31';

const DEFAULT_API_URL = 'https://api.xendit.co';

/** `apiUrl` is only set for a mock host. */
export interface XenditCredentials {
  secretKey: string;
  apiUrl?: string | null;
}

export interface Payout {
  id: string;
  reference_id: string;
  status:
    | 'ACCEPTED'
    | 'REQUESTED'
    | 'SUCCEEDED'
    | 'FAILED'
    | 'REVERSED'
    | 'CANCELLED';
  amount: number;
  failure_code?: string | null;
}

export interface PaymentChannel {
  channelCode: string;
  activated: boolean;
}

export interface Balance {
  balance: number;
}

/** `code` is Xendit's `error_code`. */
export class XenditRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

interface XenditErrorBody {
  error_code?: string;
  message?: string;
}

export interface EwalletCharge {
  id: string;
  reference_id: string;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'VOIDED' | 'REFUNDED';
  charge_amount: number;
  capture_amount?: number;
  failure_code?: string | null;
  actions?: {
    desktop_web_checkout_url?: string | null;
    mobile_web_checkout_url?: string | null;
    mobile_deeplink_checkout_url?: string | null;
    qr_checkout_string?: string | null;
  } | null;
}

export interface QrCode {
  id: string;
  reference_id: string;
  status: 'ACTIVE' | 'INACTIVE';
  qr_string: string;
  amount: number;
  expires_at?: string | null;
}

export interface QrPayment {
  id: string;
  qr_id: string;
  reference_id: string;
  status: 'SUCCEEDED' | 'FAILED';
  amount: number;
  channel_code?: string;
  created?: string;
}

export interface Invoice {
  id: string;
  external_id: string;
  status: 'PENDING' | 'PAID' | 'SETTLED' | 'EXPIRED';
  amount: number;
  paid_amount?: number;
  invoice_url: string;
  expiry_date?: string;
  paid_at?: string;
  payment_method?: string;
  payment_channel?: string;
  payment_id?: string;
}
