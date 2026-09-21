import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DonationKind,
  DonationStatus,
  NotificationCategory,
  NotificationTone,
} from '../../../infastructures/prisma/common/client';
import { NotificationScheduler } from '../../../schedulers/jobs/notification-scheduler';
import type { JwtPayload } from '../../../shared/types/jwt-payload';
import type {
  ChangeDonationStatusDto,
  DonationsSiteQueryDto,
  SiteDonationDto,
  SiteDonationListDto,
} from '../dto/donations-site-dto';
import {
  DonationsRepository,
  type DonationRow,
} from '../repositories/donations-repository';
import { toSiteDonationDto } from './donations-mapper';

/**
 * The two ladders. Goods pass through a pickup leg because the item has to reach
 * CARES before anyone can verify it; money is already paid, so it skips straight
 * to verification. Mirrors `DONATION_FLOW` in the portal.
 */
const DONATION_FLOW: Record<DonationKind, DonationStatus[]> = {
  GOODS: [
    DonationStatus.PLEDGED,
    DonationStatus.AWAITING_PICKUP,
    DonationStatus.VERIFYING,
    DonationStatus.CONFIRMED,
  ],
  MONEY: [
    DonationStatus.PLEDGED,
    DonationStatus.VERIFYING,
    DonationStatus.CONFIRMED,
  ],
};

const STATUS_LABELS: Record<DonationStatus, string> = {
  PLEDGED: 'Pledged',
  AWAITING_PICKUP: 'Waiting for pickup',
  VERIFYING: 'Verifying',
  CONFIRMED: 'Confirmed',
  DECLINED: 'Declined',
  CANCELLED: 'Cancelled',
};

/** What the donor is told on each move — the app shows it in Notifications. */
const STATUS_NOTICES: Record<DonationStatus, string> = {
  PLEDGED:
    'Your donation is back to pledged and waiting for CARES to act on it.',
  AWAITING_PICKUP:
    'A CARES volunteer will collect your donation on your chosen schedule.',
  VERIFYING: 'CARES is checking your donation against what was pledged.',
  CONFIRMED: 'CARES confirmed your donation was received. Thank you!',
  DECLINED:
    'CARES could not verify this donation. Reach out if this is unexpected.',
  CANCELLED: 'Your donation was cancelled.',
};

/** The portal's Donation Tracking: the ledger and the moves along its ladders. */
@Injectable()
export class DonationsSiteService {
  constructor(
    private readonly donationsRepository: DonationsRepository,
    private readonly notificationScheduler: NotificationScheduler,
  ) {}

  async list(query: DonationsSiteQueryDto): Promise<SiteDonationListDto> {
    const rows = await this.donationsRepository.listAllDonations(query);
    return { items: rows.map(toSiteDonationDto) };
  }

  async get(donationId: string): Promise<SiteDonationDto> {
    return toSiteDonationDto(await this.find(donationId));
  }

  /**
   * Moves a donation along its ladder. Forward moves must go one rung at a time
   * — a director cannot confirm goods that were never picked up — while DECLINED
   * is reachable from any open rung and PLEDGED reopens a declined one. A
   * cancelled donation belongs to the donor and is never reopened here.
   */
  async changeStatus(
    caller: JwtPayload,
    actorLabel: string,
    donationId: string,
    body: ChangeDonationStatusDto,
  ): Promise<SiteDonationDto> {
    const row = await this.find(donationId);
    this.assertMove(row, body.status);

    const donorEmail = row.user.accounts[0]?.email ?? null;
    const updated = await this.donationsRepository.changeStatus(
      donationId,
      row.status,
      body.status,
      {
        status: body.status,
        note: body.note?.trim() || null,
        actor_id: caller.sub,
        actor_label: actorLabel,
        notified_email: donorEmail,
      },
    );
    if (!updated) {
      throw new ConflictException(
        'This donation was updated by someone else — reload and try again',
      );
    }

    await this.notifyDonor(updated, body.status, body.note?.trim() || null);
    return toSiteDonationDto(updated);
  }

  private assertMove(row: DonationRow, to: DonationStatus): void {
    if (row.status === to) {
      throw new BadRequestException(
        `This donation is already ${STATUS_LABELS[to].toLowerCase()}`,
      );
    }
    if (row.status === DonationStatus.CANCELLED) {
      throw new BadRequestException(
        'The donor cancelled this donation; it cannot be moved',
      );
    }
    if (to === DonationStatus.DECLINED) {
      if (row.status === DonationStatus.CONFIRMED) {
        throw new BadRequestException(
          'A confirmed donation cannot be declined',
        );
      }
      return;
    }
    if (row.status === DonationStatus.DECLINED) {
      if (to !== DonationStatus.PLEDGED) {
        throw new BadRequestException(
          'A declined donation can only be reopened as pledged',
        );
      }
      return;
    }
    const flow = DONATION_FLOW[row.kind];
    const next = flow[flow.indexOf(row.status) + 1];
    if (to !== next) {
      throw new BadRequestException(
        `A ${row.kind === DonationKind.GOODS ? 'goods' : 'money'} donation moves from ${STATUS_LABELS[row.status].toLowerCase()} to ${next ? STATUS_LABELS[next].toLowerCase() : 'nowhere'} next`,
      );
    }
  }

  /** One row on the donor's feed per move; the dedupe key keeps a retry quiet. */
  private async notifyDonor(
    row: DonationRow,
    status: DonationStatus,
    note: string | null,
  ): Promise<void> {
    const reference = `DN-${String(row.sequence).padStart(4, '0')}`;
    await this.notificationScheduler.publish({
      title: `Donation ${reference} is now ${STATUS_LABELS[status].toLowerCase()}`,
      description: `${row.event.title}: ${STATUS_NOTICES[status]}${note ? ` — ${note}` : ''}`,
      category: NotificationCategory.DONATION,
      tone:
        status === DonationStatus.DECLINED
          ? NotificationTone.ATTENTION
          : NotificationTone.INFO,
      userIds: [row.user_id],
      dedupeKey: `donation-status:${row.donation_id}:${status}:${row.trail.length}`,
    });
  }

  /** The name the trail records for the portal account making the move. */
  async actorLabel(caller: JwtPayload): Promise<string> {
    const name = await this.donationsRepository.findUserName(caller.sub);
    return name ?? caller.email;
  }

  private async find(donationId: string): Promise<DonationRow> {
    const row = await this.donationsRepository.findDonation(donationId);
    if (!row) throw new NotFoundException('Donation not found');
    return row;
  }
}
