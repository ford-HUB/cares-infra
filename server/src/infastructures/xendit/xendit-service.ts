import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';

/**
 * Thin client over the Xendit REST API. Every payment channel the app offers
 * maps to one Xendit product, and each product has its own create call, its own
 * callback shape and its own status vocabulary — this class owns all three so
 * the donations module only speaks in "checkout" and "outcome".
 *
 *   GCash          → eWallet Charges   POST /ewallets/charges      cb: ewallet.capture
 *   QRPh           → QR Codes          POST /qr_codes              cb: qr.payment
 *   Card / Bank    → Invoices          POST /v2/invoices           cb: invoice paid/expired
 *
 * Auth is HTTP basic with the secret key as the username. Sandbox and live keys
 * hit the same host; the key prefix (`xnd_development_` / `xnd_production_`)
 * decides which environment answers.
 *
 * The credentials are passed in per call rather than read from the environment here:
 * they are entered by the director in the portal's Payments module and resolved by
 * `PaymentSettingsService`, so this class stays a transport with no opinion about
 * whose account the money lands in.
 */
@Injectable()
export class XenditService {
  private readonly logger = new Logger(XenditService.name);

  /** Proves a secret key works before it is saved — the portal's "Test connection". */
  async getCashBalance(credentials: XenditCredentials): Promise<Balance> {
    return this.request<Balance>(
      credentials,
      'GET',
      '/balance?account_type=CASH',
    );
  }

  /**
   * Whether a callback really came from Xendit: the `x-callback-token` header must
   * match the token saved with the account. Compared in constant time so a mismatch
   * cannot be narrowed down by timing.
   */
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

  // ------------------------------------------------------------- payouts

  /**
   * Sends money *out* to an account — used only for the token payout that proves the
   * director holds the account they recorded. Needs Payouts/Disbursements enabled on
   * the Xendit account; where it is not, Xendit refuses with a clear error code and
   * the caller reports that rather than pretending the account is proven.
   *
   * `Idempotency-key` is required by Xendit here: a retried request with the same key
   * returns the original payout instead of sending a second one.
   */
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

  // -------------------------------------------------------- activation

  /**
   * Every channel on the account and whether Xendit has activated it. This is what
   * "is GCash signed up?" actually means on Xendit's side: the channel is enabled by
   * Xendit for the merchant after their own onboarding, and nothing an API call makes
   * happen — so the portal checks it rather than claiming to switch it on.
   *
   * The shape is parsed defensively: Xendit has more than one generation of this
   * endpoint, and an unexpected field must read as "unknown", never crash the check.
   */
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

      // Some generations report activation as `is_activated`, others as a status
      // string. Anything we cannot read is treated as inactive, not as a pass.
      const status = entry.status ?? entry.channel_status;
      const activated =
        entry.is_activated === true ||
        entry.isActivated === true ||
        (typeof status === 'string' && status.toUpperCase() === 'ACTIVE');

      return [{ channelCode: code, activated }];
    });
  }

  /**
   * Points one callback type at our webhook. Xendit also lets this be set by hand in
   * the dashboard, and some accounts only allow that — a refusal here is reported,
   * never thrown, so a channel is not held back by it.
   */
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

  // ------------------------------------------------------------- eWallet

  /**
   * One-time GCash charge. The donor is sent to `mobile_web_checkout_url`, logs
   * into GCash, approves the amount and is bounced to the redirect URL; the
   * `ewallet.capture` callback is what actually settles it.
   */
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

  // ------------------------------------------------------------- QR Ph

  /**
   * Dynamic QR Ph code for a fixed amount. The app renders `qr_string`; the
   * donor scans it with any QR Ph participant (GCash, Maya, bank apps) and the
   * `qr.payment` callback reports the settlement.
   */
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

  // ------------------------------------------------------------- Invoices

  /**
   * Hosted checkout page limited to the given channels. Cards are entered on
   * Xendit's PCI page (with 3DS); PH bank transfers are direct-debit channels
   * where the donor signs in to their own bank. Xendit's invoice callback
   * (no `event` field) reports PAID / EXPIRED.
   */
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

  // ------------------------------------------------------------- transport

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

/** Pinned so the QR callback arrives in the `qr.payment` shape we parse. */
const QR_API_VERSION = '2022-07-31';

const DEFAULT_API_URL = 'https://api.xendit.co';

/** The Xendit account a call is made against. `apiUrl` is only set for a mock host. */
export interface XenditCredentials {
  secretKey: string;
  apiUrl?: string | null;
}

/** `POST /v2/payouts` — the token payout behind the ownership check. */
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

/** One channel on the Xendit account, as the activation check reads it. */
export interface PaymentChannel {
  channelCode: string;
  activated: boolean;
}

/** `GET /balance` — only the figure, which is all the connection test needs. */
export interface Balance {
  balance: number;
}

/** The gateway answered with a 4xx/5xx; `code` is Xendit's `error_code`. */
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
