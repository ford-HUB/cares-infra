import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import {
  DonationStatus,
  EventStatus,
} from '../../../infastructures/prisma/common/client';
import {
  XenditRequestError,
  XenditService,
} from '../../../infastructures/xendit/xendit-service';
import { RankingsBoardService } from '../../rankings/services/rankings-board-service';
import type {
  CreateDonationPaymentDto,
  CreateGoodsDonationDto,
  DonationDto,
  DonationListDto,
  DonationPaymentDto,
  DonationPaymentListDto,
  UpdateGoodsDonationDto,
} from '../dto/donations-mobile-dto';
import {
  DonationsRepository,
  isUniqueViolation,
  type DonationPaymentRow,
  type DonationRow,
  type GoodsDonationData,
} from '../repositories/donations-repository';
import { toDonationDto, toDonationPaymentDto } from './donations-mapper';
import { DonationsWebhookService } from './donations-webhook-service';

/** How long a checkout stays open before Xendit expires it on its side. */
const CHECKOUT_TTL_SECONDS = 30 * 60;

/** Xendit invoice channel codes behind the two hosted-checkout options. */
const CARD_CHANNELS = ['CREDIT_CARD'] as const;
const BANK_TRANSFER_CHANNELS = [
  'DD_BPI',
  'DD_UBP',
  'DD_RCBC',
  'DD_CHINABANK',
] as const;

/**
 * Only ask Xendit for the current status of a pending checkout this often per
 * row — status polling from the app must not turn into a gateway hammer.
 */
const RECONCILE_MIN_AGE_MS = 15_000;

@Injectable()
export class DonationsMobileService {
  private readonly logger = new Logger(DonationsMobileService.name);

  constructor(
    private readonly donationsRepository: DonationsRepository,
    private readonly xendit: XenditService,
    private readonly webhookService: DonationsWebhookService,
    private readonly rankings: RankingsBoardService,
  ) {}

  /**
   * Starts a checkout. The row is reserved under the client's idempotency key
   * *before* the gateway is called, so a retried tap (network blip, double
   * press) lands on the same row instead of charging twice. If the gateway
   * refuses, the reservation is released so the same key can be retried.
   */
  async createPayment(
    userId: string,
    userEmail: string,
    idempotencyKey: string,
    body: CreateDonationPaymentDto,
  ): Promise<DonationPaymentDto> {
    const existing = await this.donationsRepository.findByIdempotencyKey(
      userId,
      idempotencyKey,
    );
    if (existing) return toDonationPaymentDto(existing);

    let pending: DonationPaymentRow;
    try {
      pending = await this.donationsRepository.createPending({
        user_id: userId,
        event_id: body.eventId ?? null,
        campaign_id: body.campaignId,
        campaign_title: body.campaignTitle,
        amount: body.amount,
        method: body.method,
        idempotency_key: idempotencyKey,
        gateway_reference: this.newGatewayReference(),
      });
    } catch (error) {
      // Two requests raced on the same key; the first one owns the row.
      if (isUniqueViolation(error)) {
        const winner = await this.donationsRepository.findByIdempotencyKey(
          userId,
          idempotencyKey,
        );
        if (winner) return toDonationPaymentDto(winner);
      }
      throw error;
    }

    try {
      const checkout = await this.openCheckout(pending, userEmail);
      const row = await this.donationsRepository.attachCheckout(
        pending.donation_payment_id,
        checkout,
      );
      return toDonationPaymentDto(row);
    } catch (error) {
      await this.donationsRepository.deletePending(pending.donation_payment_id);
      if (error instanceof XenditRequestError) {
        throw new BadGatewayException(error.message);
      }
      throw error;
    }
  }

  /**
   * Current state of one checkout. While it is still pending and the callback
   * has not landed (webhooks cannot reach a dev machine without a tunnel), the
   * gateway is asked directly — but not more than once per
   * {@link RECONCILE_MIN_AGE_MS} per row.
   */
  async getPayment(
    userId: string,
    donationPaymentId: string,
  ): Promise<DonationPaymentDto> {
    let row = await this.findOwned(userId, donationPaymentId);
    if (
      row.status === 'PENDING' &&
      row.gateway_resource_id &&
      Date.now() - row.updatedAt.getTime() >= RECONCILE_MIN_AGE_MS
    ) {
      row = (await this.reconcile(row)) ?? row;
    }
    return toDonationPaymentDto(row);
  }

  async listMine(userId: string): Promise<DonationPaymentListDto> {
    const rows = await this.donationsRepository.listByUser(userId);
    return { items: rows.map(toDonationPaymentDto) };
  }

  // ------------------------------------------------------------- ledger

  /** Every donation the donor made, latest first — the Activity tab. */
  async listDonations(userId: string): Promise<DonationListDto> {
    const rows = await this.donationsRepository.listDonationsByUser(userId);
    return { items: rows.map(toDonationDto) };
  }

  async getDonation(userId: string, donationId: string): Promise<DonationDto> {
    return toDonationDto(await this.findOwnedDonation(userId, donationId));
  }

  /**
   * Pledges goods for an event. The credited value (goods-type value × quantity
   * under the saved ranking values) is snapshotted on the row, so a later change
   * to the values does not rewrite what a donor was already told.
   */
  async pledgeGoods(
    userId: string,
    body: CreateGoodsDonationDto,
  ): Promise<DonationDto> {
    const event = await this.donationsRepository.findEvent(body.eventId);
    if (!event) throw new NotFoundException('Event not found');
    const open =
      (event.status === EventStatus.Upcoming ||
        event.status === EventStatus.Ongoing) &&
      event.event_ended.getTime() >= Date.now();
    if (!open || !event.goods_donation) {
      throw new BadRequestException(
        'This event is not accepting goods donations',
      );
    }
    if (
      body.goodsType !== 'other' &&
      event.goods_types.length > 0 &&
      !event.goods_types.includes(body.goodsType)
    ) {
      throw new BadRequestException('This event does not ask for that item');
    }

    const row = await this.donationsRepository.createGoodsDonation(
      userId,
      event.event_id,
      await this.goodsData(body),
      await this.donationsRepository.findDonorEmail(userId),
    );
    return toDonationDto(row);
  }

  /** Edits a goods pledge. Only while still pledged — the drop-off leg locks it. */
  async updateGoods(
    userId: string,
    donationId: string,
    body: UpdateGoodsDonationDto,
  ): Promise<DonationDto> {
    const row = await this.findOwnedDonation(userId, donationId);
    this.assertEditable(row);
    const updated = await this.donationsRepository.updateGoodsDonation(
      donationId,
      await this.goodsData(body),
    );
    return toDonationDto(updated);
  }

  /** The donor's off-ramp: a pledged goods donation that will not be given after all. */
  async cancelGoods(userId: string, donationId: string): Promise<DonationDto> {
    const row = await this.findOwnedDonation(userId, donationId);
    this.assertEditable(row);
    const updated = await this.donationsRepository.changeStatus(
      donationId,
      DonationStatus.PLEDGED,
      DonationStatus.CANCELLED,
      {
        status: DonationStatus.CANCELLED,
        actor_label: 'Donor',
        note: 'Cancelled by the donor',
      },
    );
    if (!updated) {
      throw new BadRequestException('This donation can no longer be cancelled');
    }
    return toDonationDto(updated);
  }

  private async goodsData(
    body: CreateGoodsDonationDto | UpdateGoodsDonationDto,
  ): Promise<GoodsDonationData> {
    const settings = await this.rankings.getSettings();
    const unitValue = this.rankings.goodsUnitValue(settings, body.goodsType);
    return {
      goods_type: body.goodsType,
      goods_item: body.goodsItem?.trim() || null,
      goods_quantity: body.quantity,
      amount: unitValue * body.quantity,
      donor_contact: body.contactNumber,
      delivery_date: new Date(`${body.deliveryDate}T00:00:00.000Z`),
    };
  }

  private assertEditable(row: DonationRow): void {
    if (row.kind !== 'GOODS') {
      throw new BadRequestException('Only goods donations can be changed');
    }
    if (row.status !== DonationStatus.PLEDGED) {
      throw new BadRequestException(
        'This donation is locked — CARES has already started receiving it',
      );
    }
  }

  private async findOwnedDonation(
    userId: string,
    donationId: string,
  ): Promise<DonationRow> {
    const row = await this.donationsRepository.findDonation(donationId);
    if (!row || row.user_id !== userId) {
      throw new NotFoundException('Donation not found');
    }
    return row;
  }

  // ------------------------------------------------------------ internals

  private async findOwned(
    userId: string,
    donationPaymentId: string,
  ): Promise<DonationPaymentRow> {
    const row = await this.donationsRepository.findById(donationPaymentId);
    if (!row || row.user_id !== userId) {
      throw new NotFoundException('Donation payment not found');
    }
    return row;
  }

  /** Each channel is a different Xendit product with a different hand-off. */
  private async openCheckout(
    row: DonationPaymentRow,
    payerEmail: string,
  ): Promise<{
    gateway_resource_id: string;
    checkout_url?: string | null;
    qr_string?: string | null;
    expires_at?: Date | null;
  }> {
    const expiresAt = new Date(Date.now() + CHECKOUT_TTL_SECONDS * 1000);
    const redirect = (outcome: 'success' | 'failure') =>
      `${this.apiBaseUrl()}/api/v1/donations/payments/${row.donation_payment_id}/return?outcome=${outcome}`;

    switch (row.method) {
      case 'GCASH': {
        const charge = await this.xendit.createGcashCharge({
          referenceId: row.gateway_reference,
          amount: row.amount,
          successRedirectUrl: redirect('success'),
          failureRedirectUrl: redirect('failure'),
        });
        const url =
          charge.actions?.mobile_web_checkout_url ??
          charge.actions?.desktop_web_checkout_url;
        if (!url) {
          throw new BadGatewayException('GCash did not return a checkout link');
        }
        return {
          gateway_resource_id: charge.id,
          checkout_url: url,
          expires_at: expiresAt,
        };
      }
      case 'QRPH': {
        const qr = await this.xendit.createQrphCode({
          referenceId: row.gateway_reference,
          amount: row.amount,
          expiresAt,
        });
        return {
          gateway_resource_id: qr.id,
          qr_string: qr.qr_string,
          expires_at: qr.expires_at ? new Date(qr.expires_at) : expiresAt,
        };
      }
      case 'CARD':
      case 'BANK_TRANSFER': {
        const invoice = await this.xendit.createInvoice({
          externalId: row.gateway_reference,
          amount: row.amount,
          description: `CARES donation — ${row.campaign_title}`,
          payerEmail,
          paymentMethods:
            row.method === 'CARD' ? CARD_CHANNELS : BANK_TRANSFER_CHANNELS,
          successRedirectUrl: redirect('success'),
          failureRedirectUrl: redirect('failure'),
          durationSeconds: CHECKOUT_TTL_SECONDS,
        });
        return {
          gateway_resource_id: invoice.id,
          checkout_url: invoice.invoice_url,
          expires_at: invoice.expiry_date
            ? new Date(invoice.expiry_date)
            : expiresAt,
        };
      }
    }
  }

  /** Pulls the live status from Xendit and settles the row if it moved. */
  private async reconcile(
    row: DonationPaymentRow,
  ): Promise<DonationPaymentRow | null> {
    const resourceId = row.gateway_resource_id!;
    try {
      switch (row.method) {
        case 'GCASH': {
          const charge = await this.xendit.getEwalletCharge(resourceId);
          await this.webhookService.applyEwalletStatus(charge);
          break;
        }
        case 'QRPH': {
          // QR codes only expose ACTIVE/INACTIVE; a settled QR is reported by
          // the qr.payment callback, so the most we can do here is expire it.
          const qr = await this.xendit.getQrCode(resourceId);
          if (qr.status === 'INACTIVE') {
            await this.donationsRepository.settle(row.gateway_reference, {
              status: 'EXPIRED',
              failure_reason: 'The QR code expired before it was paid',
            });
          }
          break;
        }
        case 'CARD':
        case 'BANK_TRANSFER': {
          const invoice = await this.xendit.getInvoice(resourceId);
          await this.webhookService.applyInvoiceStatus(invoice);
          break;
        }
      }
    } catch (error) {
      // Polling must keep working when the gateway hiccups; the callback will
      // still land, and the next poll retries the lookup.
      this.logger.warn(
        `Reconcile skipped for ${row.gateway_reference}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
    return this.donationsRepository.findById(row.donation_payment_id);
  }

  /** `CARES-DON-` + 12 hex chars: readable on a bank statement, unique enough for a lifetime. */
  private newGatewayReference(): string {
    return `CARES-DON-${randomBytes(6).toString('hex').toUpperCase()}`;
  }

  private apiBaseUrl(): string {
    return (
      process.env.API_PUBLIC_URL ??
      `http://localhost:${process.env.PORT ?? 3000}`
    ).replace(/\/+$/, '');
  }
}
