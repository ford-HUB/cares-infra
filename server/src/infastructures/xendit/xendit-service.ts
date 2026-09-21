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
 */
@Injectable()
export class XenditService {
  private readonly logger = new Logger(XenditService.name);
  private readonly baseUrl = (
    process.env.XENDIT_API_URL ?? 'https://api.xendit.co'
  ).replace(/\/+$/, '');

  private get secretKey(): string {
    const key = process.env.XENDIT_SECRET_KEY?.trim();
    if (!key) {
      throw new ServiceUnavailableException(
        'Online payments are not configured yet',
      );
    }
    return key;
  }

  /** Whether a callback really came from Xendit: its token must match ours. */
  isCallbackTokenValid(token: string | undefined): boolean {
    const expected = process.env.XENDIT_WEBHOOK_TOKEN?.trim();
    if (!expected || !token) return false;
    const a = Buffer.from(token);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  // ------------------------------------------------------------- eWallet

  /**
   * One-time GCash charge. The donor is sent to `mobile_web_checkout_url`, logs
   * into GCash, approves the amount and is bounced to the redirect URL; the
   * `ewallet.capture` callback is what actually settles it.
   */
  async createGcashCharge(input: {
    referenceId: string;
    amount: number;
    successRedirectUrl: string;
    failureRedirectUrl: string;
  }): Promise<EwalletCharge> {
    return this.request<EwalletCharge>('POST', '/ewallets/charges', {
      reference_id: input.referenceId,
      currency: 'PHP',
      amount: input.amount,
      checkout_method: 'ONE_TIME_PAYMENT',
      channel_code: 'PH_GCASH',
      channel_properties: {
        success_redirect_url: input.successRedirectUrl,
        failure_redirect_url: input.failureRedirectUrl,
      },
    });
  }

  async getEwalletCharge(chargeId: string): Promise<EwalletCharge> {
    return this.request<EwalletCharge>(
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
  async createQrphCode(input: {
    referenceId: string;
    amount: number;
    expiresAt: Date;
  }): Promise<QrCode> {
    return this.request<QrCode>(
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

  async getQrCode(qrId: string): Promise<QrCode> {
    return this.request<QrCode>(
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
  async createInvoice(input: {
    externalId: string;
    amount: number;
    description: string;
    payerEmail: string;
    paymentMethods: readonly string[];
    successRedirectUrl: string;
    failureRedirectUrl: string;
    durationSeconds: number;
  }): Promise<Invoice> {
    return this.request<Invoice>('POST', '/v2/invoices', {
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

  async getInvoice(invoiceId: string): Promise<Invoice> {
    return this.request<Invoice>(
      'GET',
      `/v2/invoices/${encodeURIComponent(invoiceId)}`,
    );
  }

  // ------------------------------------------------------------- transport

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: Record<string, unknown>,
    extraHeaders: Record<string, string> = {},
  ): Promise<T> {
    const auth = Buffer.from(`${this.secretKey}:`).toString('base64');
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
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
