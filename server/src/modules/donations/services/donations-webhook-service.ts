import { Injectable, Logger } from '@nestjs/common';
import {
  NotificationCategory,
  NotificationTone,
  RoleType,
  type DonationPaymentStatus,
  type Prisma,
} from '../../../infastructures/prisma/common/client';
import { NotificationScheduler } from '../../../schedulers/jobs/notification-scheduler';
import type {
  EwalletCharge,
  Invoice,
  QrPayment,
} from '../../../infastructures/xendit/xendit-service';
import {
  DonationsRepository,
  type DonationPaymentRow,
} from '../repositories/donations-repository';

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

  constructor(
    private readonly donationsRepository: DonationsRepository,
    private readonly notificationScheduler: NotificationScheduler,
  ) {}

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
        await this.settle(
          row,
          {
            status: 'FAILED',
            failure_reason: 'Captured amount did not match the donation',
          },
          tx,
        );
        return;
      }
      await this.settle(
        row,
        {
          status: 'PAID',
          payment_reference: charge.id,
          payment_channel: 'PH_GCASH',
          paid_at: new Date(),
        },
        tx,
      );
    } else if (charge.status === 'FAILED' || charge.status === 'VOIDED') {
      await this.settle(
        row,
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
        await this.settle(
          row,
          {
            status: 'FAILED',
            failure_reason: 'Scanned amount did not match the donation',
          },
          tx,
        );
        return;
      }
      await this.settle(
        row,
        {
          status: 'PAID',
          payment_reference: payment.id,
          payment_channel: payment.channel_code ?? 'QRPH',
          paid_at: payment.created ? new Date(payment.created) : new Date(),
        },
        tx,
      );
    } else {
      await this.settle(
        row,
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
        await this.settle(
          row,
          {
            status: 'FAILED',
            failure_reason: 'Paid amount did not match the donation',
          },
          tx,
        );
        return;
      }
      await this.settle(
        row,
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
      await this.settle(
        row,
        {
          status: 'EXPIRED',
          failure_reason: 'The checkout expired before it was paid',
        },
        tx,
      );
    }
  }

  /**
   * Every payment outcome goes through here — callbacks and the app's own
   * reconcile poll alike — so the donor hears about it exactly once: the
   * repository only moves a PENDING row, and a zero count means another path
   * already settled it and notified.
   */
  async settle(
    row: DonationPaymentRow,
    data: Parameters<DonationsRepository['settle']>[1],
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const count = await this.donationsRepository.settle(
      row.gateway_reference,
      data,
      tx,
    );
    if (count === 0) return;
    await this.notifyDonor(row, data.status, data.failure_reason ?? null);
  }

  private async notifyDonor(
    row: DonationPaymentRow,
    status: Exclude<DonationPaymentStatus, 'PENDING'>,
    reason: string | null,
  ): Promise<void> {
    const amount = `₱${row.amount.toLocaleString('en-PH')}`;
    const notice =
      status === 'PAID'
        ? {
            title: `Thank you — your ${amount} donation went through`,
            description: `Your gift to ${row.campaign_title} was received. CARES will verify and confirm it shortly.`,
            tone: NotificationTone.INFO,
          }
        : status === 'EXPIRED'
          ? {
              title: `Your ${amount} checkout expired`,
              description: `The payment for ${row.campaign_title} was not completed in time. Nothing was charged — you can donate again from the campaign.`,
              tone: NotificationTone.ATTENTION,
            }
          : {
              title: `Your ${amount} donation did not go through`,
              description: `${reason ?? 'The payment failed'}. Nothing was recorded for ${row.campaign_title} — you can try again from the campaign.`,
              tone: NotificationTone.ATTENTION,
            };

    await this.notificationScheduler.publish({
      ...notice,
      category: NotificationCategory.DONATION,
      href: `/donations/payments/${row.donation_payment_id}`,
      userIds: [row.user_id],
      audienceRole: RoleType.DONOR,
      dedupeKey: `donation-payment:${row.donation_payment_id}:${status}`,
    });
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
