import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '../../../infastructures/prisma/common/client';
import type {
  EwalletCharge,
  Invoice,
  QrPayment,
} from '../../../infastructures/xendit/xendit-service';
import { DonationsRepository } from '../repositories/donations-repository';

/**
 * Translates each Xendit callback into a status change on the matching
 * DonationPayment. Three shapes arrive on one URL:
 *
 *   { event: 'ewallet.capture', data: EwalletCharge }   GCash
 *   { event: 'qr.payment',      data: QrPayment }       QRPh
 *   Invoice                                             card / bank (no `event`)
 *
 * Every path is idempotent twice over: the `webhook-id` is recorded in the
 * same transaction as the update, and the update itself only touches PENDING
 * rows.
 */
@Injectable()
export class DonationsWebhookService {
  private readonly logger = new Logger(DonationsWebhookService.name);

  constructor(private readonly donationsRepository: DonationsRepository) {}

  /** Returns what happened, for the log line and the 200 body. */
  async handle(
    webhookId: string,
    body: Record<string, unknown>,
  ): Promise<'applied' | 'duplicate' | 'ignored'> {
    const kind = this.classify(body);
    if (!kind) {
      this.logger.warn(`Unrecognised Xendit callback ${webhookId} ignored`);
      return 'ignored';
    }

    const applied = await this.donationsRepository.applyWebhook(
      webhookId,
      kind.event,
      kind.reference,
      body as Prisma.InputJsonValue,
      async (tx) => {
        switch (kind.event) {
          case 'ewallet.capture':
            await this.applyEwalletStatus(kind.data, tx);
            break;
          case 'qr.payment':
            await this.applyQrPayment(kind.data, tx);
            break;
          case 'invoice':
            await this.applyInvoiceStatus(kind.data, tx);
            break;
        }
      },
    );

    if (!applied) {
      this.logger.log(`Xendit callback ${webhookId} already applied`);
      return 'duplicate';
    }
    this.logger.log(`Xendit ${kind.event} applied to ${kind.reference}`);
    return 'applied';
  }

  async applyEwalletStatus(
    charge: EwalletCharge,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const row = await this.donationsRepository.findByGatewayReference(
      charge.reference_id,
    );
    if (!row) return;
    if (charge.status === 'SUCCEEDED') {
      if (
        !this.amountMatches(
          row.amount,
          charge.capture_amount ?? charge.charge_amount,
        )
      ) {
        await this.donationsRepository.settle(
          charge.reference_id,
          {
            status: 'FAILED',
            failure_reason: 'Captured amount did not match the donation',
          },
          tx,
        );
        return;
      }
      await this.donationsRepository.settle(
        charge.reference_id,
        {
          status: 'PAID',
          payment_reference: charge.id,
          payment_channel: 'PH_GCASH',
          paid_at: new Date(),
        },
        tx,
      );
    } else if (charge.status === 'FAILED' || charge.status === 'VOIDED') {
      await this.donationsRepository.settle(
        charge.reference_id,
        {
          status: 'FAILED',
          failure_reason: charge.failure_code ?? 'GCash payment failed',
        },
        tx,
      );
    }
  }

  async applyQrPayment(
    payment: QrPayment,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const row = await this.donationsRepository.findByGatewayReference(
      payment.reference_id,
    );
    if (!row) return;
    if (payment.status === 'SUCCEEDED') {
      if (!this.amountMatches(row.amount, payment.amount)) {
        await this.donationsRepository.settle(
          payment.reference_id,
          {
            status: 'FAILED',
            failure_reason: 'Scanned amount did not match the donation',
          },
          tx,
        );
        return;
      }
      await this.donationsRepository.settle(
        payment.reference_id,
        {
          status: 'PAID',
          payment_reference: payment.id,
          payment_channel: payment.channel_code ?? 'QRPH',
          paid_at: payment.created ? new Date(payment.created) : new Date(),
        },
        tx,
      );
    } else {
      await this.donationsRepository.settle(
        payment.reference_id,
        { status: 'FAILED', failure_reason: 'QR Ph payment failed' },
        tx,
      );
    }
  }

  async applyInvoiceStatus(
    invoice: Invoice,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const row = await this.donationsRepository.findByGatewayReference(
      invoice.external_id,
    );
    if (!row) return;
    if (invoice.status === 'PAID' || invoice.status === 'SETTLED') {
      if (
        !this.amountMatches(row.amount, invoice.paid_amount ?? invoice.amount)
      ) {
        await this.donationsRepository.settle(
          invoice.external_id,
          {
            status: 'FAILED',
            failure_reason: 'Paid amount did not match the donation',
          },
          tx,
        );
        return;
      }
      await this.donationsRepository.settle(
        invoice.external_id,
        {
          status: 'PAID',
          payment_reference: invoice.payment_id ?? invoice.id,
          payment_channel:
            invoice.payment_channel ?? invoice.payment_method ?? null,
          paid_at: invoice.paid_at ? new Date(invoice.paid_at) : new Date(),
        },
        tx,
      );
    } else if (invoice.status === 'EXPIRED') {
      await this.donationsRepository.settle(
        invoice.external_id,
        {
          status: 'EXPIRED',
          failure_reason: 'The checkout expired before it was paid',
        },
        tx,
      );
    }
  }

  // ------------------------------------------------------------ internals

  private classify(
    body: Record<string, unknown>,
  ):
    | { event: 'ewallet.capture'; reference: string; data: EwalletCharge }
    | { event: 'qr.payment'; reference: string; data: QrPayment }
    | { event: 'invoice'; reference: string; data: Invoice }
    | null {
    const event = typeof body.event === 'string' ? body.event : null;
    const data =
      body.data && typeof body.data === 'object'
        ? (body.data as Record<string, unknown>)
        : null;

    if (
      event === 'ewallet.capture' &&
      data &&
      typeof data.reference_id === 'string'
    ) {
      return {
        event,
        reference: data.reference_id,
        data: data as unknown as EwalletCharge,
      };
    }
    if (
      event === 'qr.payment' &&
      data &&
      typeof data.reference_id === 'string'
    ) {
      return {
        event,
        reference: data.reference_id,
        data: data as unknown as QrPayment,
      };
    }
    if (
      !event &&
      typeof body.external_id === 'string' &&
      typeof body.status === 'string' &&
      typeof body.id === 'string'
    ) {
      return {
        event: 'invoice',
        reference: body.external_id,
        data: body as unknown as Invoice,
      };
    }
    return null;
  }

  /** Xendit reports amounts as numbers in whole pesos for PHP; tolerate float noise. */
  private amountMatches(expected: number, actual: number | undefined): boolean {
    return actual !== undefined && Math.abs(actual - expected) < 0.01;
  }
}
