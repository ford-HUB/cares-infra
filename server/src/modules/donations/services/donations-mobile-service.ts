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
  NotificationCategory,
  NotificationTone,
  RoleType,
} from '../../../infastructures/prisma/common/client';
import { NotificationScheduler } from '../../../schedulers/jobs/notification-scheduler';
import {
  XenditRequestError,
  XenditService,
  type XenditCredentials,
} from '../../../infastructures/xendit/xendit-service';
import {
  PaymentSettingsService,
  type PaymentChannelConfig,
} from '../../payments/services/payment-settings-service';
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
import { apiPublicUrl } from '../../../shared/utils/environment-utils';

/** Xendit expires it after this. */
const CHECKOUT_TTL_SECONDS = 30 * 60;

/** Per-row throttle on gateway status lookups. */
const RECONCILE_MIN_AGE_MS = 15_000;

@Injectable()
export class DonationsMobileService {
  private readonly logger = new Logger(DonationsMobileService.name);

  constructor(
    private readonly donationsRepository: DonationsRepository,
    private readonly xendit: XenditService,
    private readonly paymentSettings: PaymentSettingsService,
    private readonly webhookService: DonationsWebhookService,
    private readonly rankings: RankingsBoardService,
    private readonly notificationScheduler: NotificationScheduler,
  ) {}

  /** Reserves the row under the idempotency key before calling the gateway; released on refusal. */
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

    // The portal's Payments settings decide, not the app.
    const { credentials, channel, config } =
      await this.paymentSettings.resolveCheckout(body.method, body.amount);

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
      // Raced on the same key; the first owns the row.
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
      const checkout = await this.openCheckout(pending, userEmail, {
        credentials,
        channel,
        statementName: config.statementName,
      });
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

  /** Reconciles with the gateway while pending (webhooks can't reach dev), throttled by {@link RECONCILE_MIN_AGE_MS}. */
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

  /** Latest first. */
  async listDonations(userId: string): Promise<DonationListDto> {
    const rows = await this.donationsRepository.listDonationsByUser(userId);
    return { items: rows.map(toDonationDto) };
  }

  async getDonation(userId: string, donationId: string): Promise<DonationDto> {
    return toDonationDto(await this.findOwnedDonation(userId, donationId));
  }

  /** Credited value is snapshotted so later ranking value changes don't rewrite it. */
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
    await this.notifyGoods(row, {
      title: `Goods pledge ${donationReference(row)} recorded`,
      description: `Thank you for pledging to ${row.event.title}. Bring the items to the CARES office on your drop-off day — we'll update you as the pledge moves along.`,
    });
    return toDonationDto(row);
  }

  /** Only while still pledged. */
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
    await this.notifyGoods(updated, {
      title: `Goods pledge ${donationReference(updated)} cancelled`,
      description: `Your pledge to ${updated.event.title} was withdrawn. You can pledge again while the campaign is open.`,
    });
    return toDonationDto(updated);
  }

  private async notifyGoods(
    row: { donation_id: string; user_id: string; status: DonationStatus },
    notice: { title: string; description: string },
  ): Promise<void> {
    await this.notificationScheduler.publish({
      ...notice,
      category: NotificationCategory.DONATION,
      tone: NotificationTone.INFO,
      href: `/donations/${row.donation_id}`,
      userIds: [row.user_id],
      audienceRole: RoleType.DONOR,
      dedupeKey: `donation-goods:${row.donation_id}:${row.status}`,
    });
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
    gateway: {
      credentials: XenditCredentials;
      channel: PaymentChannelConfig;
      statementName: string | null;
    },
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
        const charge = await this.xendit.createGcashCharge(
          gateway.credentials,
          {
            referenceId: row.gateway_reference,
            amount: row.amount,
            successRedirectUrl: redirect('success'),
            failureRedirectUrl: redirect('failure'),
          },
        );
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
        const qr = await this.xendit.createQrphCode(gateway.credentials, {
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
        const invoice = await this.xendit.createInvoice(gateway.credentials, {
          externalId: row.gateway_reference,
          amount: row.amount,
          description: `${gateway.statementName?.trim() || 'CARES donation'} — ${row.campaign_title}`,
          payerEmail,
          // Ticked banks and cards; catalog defaults when none.
          paymentMethods: gateway.channel.channelCodes,
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

  private async reconcile(
    row: DonationPaymentRow,
  ): Promise<DonationPaymentRow | null> {
    const resourceId = row.gateway_resource_id!;
    // Credentials only: rows opened before a channel was disabled still reconcile.
    const credentials = await this.paymentSettings.credentialsOrNull();
    if (!credentials) return null;

    try {
      switch (row.method) {
        case 'GCASH': {
          const charge = await this.xendit.getEwalletCharge(
            credentials,
            resourceId,
          );
          await this.webhookService.applyEwalletStatus(charge);
          break;
        }
        case 'QRPH': {
          // QR only exposes ACTIVE/INACTIVE; payment comes via the callback, so only expiry here.
          const qr = await this.xendit.getQrCode(credentials, resourceId);
          if (qr.status === 'INACTIVE') {
            await this.webhookService.settle(row, {
              status: 'EXPIRED',
              failure_reason: 'The QR code expired before it was paid',
            });
          }
          break;
        }
        case 'CARD':
        case 'BANK_TRANSFER': {
          const invoice = await this.xendit.getInvoice(credentials, resourceId);
          await this.webhookService.applyInvoiceStatus(invoice);
          break;
        }
      }
    } catch (error) {
      // Keep polling through gateway hiccups.
      this.logger.warn(
        `Reconcile skipped for ${row.gateway_reference}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
    return this.donationsRepository.findById(row.donation_payment_id);
  }

  /** `CARES-DON-` + 12 hex chars. */
  private newGatewayReference(): string {
    return `CARES-DON-${randomBytes(6).toString('hex').toUpperCase()}`;
  }

  private apiBaseUrl(): string {
    return apiPublicUrl();
  }
}

function donationReference(row: { sequence: number }): string {
  return `DN-${String(row.sequence).padStart(4, '0')}`;
}
