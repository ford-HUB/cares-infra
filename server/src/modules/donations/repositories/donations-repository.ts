import { Injectable } from '@nestjs/common';
import {
  DonationStatus,
  Prisma,
} from '../../../infastructures/prisma/common/client';
import type {
  DonationKind,
  DonationPaymentMethod,
  DonationPaymentStatus,
} from '../../../infastructures/prisma/common/client';
import { PrismaService } from '../../../infastructures/prisma/prisma-service';

/** Prisma's unique-constraint violation code. */
const UNIQUE_VIOLATION = 'P2002';

export function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === UNIQUE_VIOLATION
  );
}

/** A checkout row plus the ledger row it opened, if it has settled as paid. */
const PAYMENT_INCLUDE = {
  donation: { select: { donation_id: true } },
} as const;

export type DonationPaymentRow = Prisma.DonationPaymentGetPayload<{
  include: typeof PAYMENT_INCLUDE;
}>;

/** A ledger row with everything both clients render: event, payment, donor, trail. */
const DONATION_INCLUDE = {
  event: { select: { title: true } },
  payment: {
    select: {
      method: true,
      payment_reference: true,
      gateway_reference: true,
    },
  },
  user: {
    select: {
      user_id: true,
      firstname: true,
      lastname: true,
      phone_number: true,
      accounts: {
        select: { email: true },
        orderBy: { createdAt: 'asc' },
        take: 1,
      },
    },
  },
  trail: { orderBy: { createdAt: 'asc' } },
} as const;

export type DonationRow = Prisma.DonationGetPayload<{
  include: typeof DONATION_INCLUDE;
}>;

export interface GoodsDonationData {
  goods_type: string;
  goods_item: string | null;
  goods_quantity: number;
  amount: number;
  pickup_address: string;
  pickup_contact: string;
  pickup_date: Date;
  pickup_time_minutes: number;
}

export interface TrailEntryData {
  status: DonationStatus;
  note?: string | null;
  actor_id?: string | null;
  actor_label: string;
  notified_email?: string | null;
}

@Injectable()
export class DonationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ------------------------------------------------------------- payments

  findByIdempotencyKey(
    userId: string,
    idempotencyKey: string,
  ): Promise<DonationPaymentRow | null> {
    return this.prisma.donationPayment.findUnique({
      where: {
        user_id_idempotency_key: {
          user_id: userId,
          idempotency_key: idempotencyKey,
        },
      },
      include: PAYMENT_INCLUDE,
    });
  }

  findById(donationPaymentId: string): Promise<DonationPaymentRow | null> {
    return this.prisma.donationPayment.findUnique({
      where: { donation_payment_id: donationPaymentId },
      include: PAYMENT_INCLUDE,
    });
  }

  findByGatewayReference(
    gatewayReference: string,
  ): Promise<DonationPaymentRow | null> {
    return this.prisma.donationPayment.findUnique({
      where: { gateway_reference: gatewayReference },
      include: PAYMENT_INCLUDE,
    });
  }

  listByUser(userId: string): Promise<DonationPaymentRow[]> {
    return this.prisma.donationPayment.findMany({
      where: { user_id: userId },
      orderBy: { createdAt: 'desc' },
      include: PAYMENT_INCLUDE,
    });
  }

  createPending(data: {
    user_id: string;
    event_id: number | null;
    campaign_id: string;
    campaign_title: string;
    amount: number;
    method: DonationPaymentMethod;
    idempotency_key: string;
    gateway_reference: string;
  }): Promise<DonationPaymentRow> {
    return this.prisma.donationPayment.create({
      data,
      include: PAYMENT_INCLUDE,
    });
  }

  /** Fills in what the gateway handed back for the freshly created checkout. */
  attachCheckout(
    donationPaymentId: string,
    data: {
      gateway_resource_id: string;
      checkout_url?: string | null;
      qr_string?: string | null;
      expires_at?: Date | null;
    },
  ): Promise<DonationPaymentRow> {
    return this.prisma.donationPayment.update({
      where: { donation_payment_id: donationPaymentId },
      data,
      include: PAYMENT_INCLUDE,
    });
  }

  /** The gateway call failed, so the reservation is released for a retry. */
  deletePending(donationPaymentId: string): Promise<void> {
    return this.prisma.donationPayment
      .deleteMany({
        where: { donation_payment_id: donationPaymentId, status: 'PENDING' },
      })
      .then(() => undefined);
  }

  /**
   * Moves a PENDING payment to a terminal status. The `status: PENDING` guard in
   * the WHERE makes this a no-op on replay, so a callback that arrives twice
   * (or after a reconcile already settled the row) changes nothing.
   *
   * A settle to PAID also opens the ledger row: the money is in, so the
   * donation is pledged and waits for a director to verify and confirm it. It
   * needs an event behind the campaign — a checkout for a campaign that is not
   * an event has nothing to be tracked against and stays a bare payment.
   */
  async settle(
    gatewayReference: string,
    data: {
      status: Exclude<DonationPaymentStatus, 'PENDING'>;
      payment_reference?: string | null;
      payment_channel?: string | null;
      paid_at?: Date | null;
      failure_reason?: string | null;
    },
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<number> {
    const { count } = await tx.donationPayment.updateMany({
      where: { gateway_reference: gatewayReference, status: 'PENDING' },
      data,
    });
    if (count === 0 || data.status !== 'PAID') return count;

    const payment = await tx.donationPayment.findUnique({
      where: { gateway_reference: gatewayReference },
      select: {
        donation_payment_id: true,
        user_id: true,
        event_id: true,
        amount: true,
        user: {
          select: {
            accounts: {
              select: { email: true },
              orderBy: { createdAt: 'asc' },
              take: 1,
            },
          },
        },
      },
    });
    if (!payment || payment.event_id === null) return count;

    await tx.donation.create({
      data: {
        user_id: payment.user_id,
        event_id: payment.event_id,
        kind: 'MONEY',
        status: DonationStatus.PLEDGED,
        amount: payment.amount,
        payment_id: payment.donation_payment_id,
        trail: {
          create: {
            status: DonationStatus.PLEDGED,
            actor_label: 'System',
            note: 'Payment received through the gateway',
            notified_email: payment.user.accounts[0]?.email ?? null,
          },
        },
      },
    });
    return count;
  }

  /**
   * Records a callback and applies it atomically. Resolves `false` when the
   * `webhook-id` was already recorded — Xendit re-sent an event we handled.
   */
  async applyWebhook(
    webhookId: string,
    event: string,
    gatewayReference: string | null,
    payload: Prisma.InputJsonValue,
    apply: (tx: Prisma.TransactionClient) => Promise<void>,
  ): Promise<boolean> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.paymentWebhookEvent.create({
          data: {
            webhook_id: webhookId,
            event,
            gateway_reference: gatewayReference,
            payload,
          },
        });
        await apply(tx);
      });
      return true;
    } catch (error) {
      if (isUniqueViolation(error)) return false;
      throw error;
    }
  }

  // --------------------------------------------------------------- ledger

  /** The event a pledge is for: whether it still runs and what it accepts. */
  findEvent(eventId: number) {
    return this.prisma.event.findUnique({
      where: { event_id: eventId },
      select: {
        event_id: true,
        title: true,
        status: true,
        event_ended: true,
        funds_donation: true,
        goods_donation: true,
        goods_types: true,
      },
    });
  }

  findUserName(userId: string): Promise<string | null> {
    return this.prisma.user
      .findUnique({
        where: { user_id: userId },
        select: { firstname: true, lastname: true },
      })
      .then((user) =>
        user ? `${user.firstname} ${user.lastname}`.trim() || null : null,
      );
  }

  findDonorEmail(userId: string): Promise<string | null> {
    return this.prisma.account
      .findFirst({
        where: { user_id: userId },
        orderBy: { createdAt: 'asc' },
        select: { email: true },
      })
      .then((account) => account?.email ?? null);
  }

  findDonation(donationId: string): Promise<DonationRow | null> {
    return this.prisma.donation.findUnique({
      where: { donation_id: donationId },
      include: DONATION_INCLUDE,
    });
  }

  listDonationsByUser(userId: string): Promise<DonationRow[]> {
    return this.prisma.donation.findMany({
      where: { user_id: userId },
      orderBy: { createdAt: 'desc' },
      include: DONATION_INCLUDE,
    });
  }

  /** The whole ledger for the portal, latest activity first. */
  listAllDonations(filter: {
    status?: DonationStatus;
    kind?: DonationKind;
  }): Promise<DonationRow[]> {
    return this.prisma.donation.findMany({
      where: {
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.kind ? { kind: filter.kind } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      include: DONATION_INCLUDE,
    });
  }

  createGoodsDonation(
    userId: string,
    eventId: number,
    data: GoodsDonationData,
    notifiedEmail: string | null,
  ): Promise<DonationRow> {
    return this.prisma.donation.create({
      data: {
        user_id: userId,
        event_id: eventId,
        kind: 'GOODS',
        status: DonationStatus.PLEDGED,
        ...data,
        trail: {
          create: {
            status: DonationStatus.PLEDGED,
            actor_label: 'System',
            note: 'Donor pledged the goods',
            notified_email: notifiedEmail,
          },
        },
      },
      include: DONATION_INCLUDE,
    });
  }

  updateGoodsDonation(
    donationId: string,
    data: GoodsDonationData,
  ): Promise<DonationRow> {
    return this.prisma.donation.update({
      where: { donation_id: donationId },
      data,
      include: DONATION_INCLUDE,
    });
  }

  /**
   * Moves a donation to a new rung and writes the trail entry in one transaction.
   * `from` guards the move: a stale screen that races another change is a no-op
   * and comes back null rather than overwriting the newer status.
   */
  async changeStatus(
    donationId: string,
    from: DonationStatus,
    to: DonationStatus,
    entry: TrailEntryData,
  ): Promise<DonationRow | null> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.donation.updateMany({
        where: { donation_id: donationId, status: from },
        data: {
          status: to,
          confirmed_at:
            to === DonationStatus.CONFIRMED
              ? new Date()
              : from === DonationStatus.CONFIRMED
                ? null
                : undefined,
        },
      });
      if (count === 0) return null;
      await tx.donationTrailEntry.create({
        data: {
          donation_id: donationId,
          status: entry.status,
          note: entry.note ?? null,
          actor_id: entry.actor_id ?? null,
          actor_label: entry.actor_label,
          notified_email: entry.notified_email ?? null,
        },
      });
      return tx.donation.findUnique({
        where: { donation_id: donationId },
        include: DONATION_INCLUDE,
      });
    });
  }

  /** Money raised and rows opened per event, for the donor's campaign cards. */
  async totalsByEvent(
    eventIds: number[],
  ): Promise<Map<number, { fundsRaised: number; donations: number }>> {
    if (eventIds.length === 0) return new Map();
    const rows = await this.prisma.donation.groupBy({
      by: ['event_id', 'kind'],
      where: {
        event_id: { in: eventIds },
        status: {
          in: [
            DonationStatus.PLEDGED,
            DonationStatus.AWAITING_PICKUP,
            DonationStatus.VERIFYING,
            DonationStatus.CONFIRMED,
          ],
        },
      },
      _sum: { amount: true },
      _count: { _all: true },
    });
    const totals = new Map<
      number,
      { fundsRaised: number; donations: number }
    >();
    for (const row of rows) {
      const bucket = totals.get(row.event_id) ?? {
        fundsRaised: 0,
        donations: 0,
      };
      bucket.donations += row._count._all;
      if (row.kind === 'MONEY') bucket.fundsRaised += row._sum.amount ?? 0;
      totals.set(row.event_id, bucket);
    }
    return totals;
  }
}
