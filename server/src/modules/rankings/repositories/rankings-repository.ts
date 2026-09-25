import { Injectable } from '@nestjs/common';
import {
  AttendanceStatus,
  DonationStatus,
  EventStatus,
  Prisma,
  RoleType,
} from '../../../infastructures/prisma/common/client';
import { PrismaService } from '../../../infastructures/prisma/prisma-service';

/** Ruled attendance plus the volunteer it belongs to — the board's raw material. */
const RANKED_ATTENDANCE_SELECT = {
  status: true,
  hours_rendered: true,
  event: { select: { event_ended: true } },
  user: {
    select: {
      user_id: true,
      firstname: true,
      lastname: true,
      accounts: {
        select: { email: true },
        orderBy: { createdAt: 'asc' },
        take: 1,
      },
      user_school_info: {
        select: { department: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  },
} as const;

export type RankedAttendanceRow = Prisma.EventAttendanceGetPayload<{
  select: typeof RANKED_ATTENDANCE_SELECT;
}>;

/** A confirmed donation plus its donor — the donor board's raw material. */
const CONFIRMED_DONATION_SELECT = {
  kind: true,
  amount: true,
  confirmed_at: true,
  /** The college the gift is credited to on the department board. */
  event: { select: { department: true } },
  user: {
    select: {
      user_id: true,
      firstname: true,
      lastname: true,
      accounts: {
        select: { email: true },
        orderBy: { createdAt: 'asc' },
        take: 1,
      },
    },
  },
} as const;

export type ConfirmedDonationRow = Prisma.DonationGetPayload<{
  select: typeof CONFIRMED_DONATION_SELECT;
}>;

export interface RankedAttendanceFilter {
  /** Only events that ended at or after this moment. */
  since?: Date;
  /** Only one volunteer's rows — for a profile's own tally. */
  userId?: string;
  /**
   * Only volunteers whose school record files them under one of these spellings
   * of a college — the department the volunteer is actually assigned to, whatever
   * events they attended.
   */
  volunteerDepartments?: string[];
}

@Injectable()
export class RankingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findSettings() {
    return this.prisma.rankingSettings.findFirst({
      orderBy: { createdAt: 'asc' },
    });
  }

  /** There is one settings row; the first save creates it, later saves update it. */
  async saveSettings(data: {
    points_per_attendance: number;
    absence_penalty_step: number;
    absence_reset_days: number;
    donor_pesos_per_point: number;
    goods_type_values: Prisma.InputJsonValue;
    default_period: string;
    tiers: Prisma.InputJsonValue;
  }) {
    const existing = await this.findSettings();
    if (!existing) return this.prisma.rankingSettings.create({ data });
    return this.prisma.rankingSettings.update({
      where: { ranking_settings_id: existing.ranking_settings_id },
      data,
    });
  }

  /**
   * Every ruled row (COMPLETED / ABSENT) of a volunteer on an event that has ended
   * and was not cancelled. PENDING rows are left out here rather than in the scorer:
   * an unsynced device is not a miss.
   */
  findRankedAttendance(
    now: Date,
    filter: RankedAttendanceFilter = {},
  ): Promise<RankedAttendanceRow[]> {
    return this.prisma.eventAttendance.findMany({
      where: {
        status: { in: [AttendanceStatus.COMPLETED, AttendanceStatus.ABSENT] },
        ...(filter.userId ? { user_id: filter.userId } : {}),
        user: {
          role: { type: RoleType.VOLUNTEER },
          ...(filter.volunteerDepartments
            ? {
                user_school_info: {
                  some: {
                    department: {
                      name: {
                        in: filter.volunteerDepartments,
                        mode: Prisma.QueryMode.insensitive,
                      },
                    },
                  },
                },
              }
            : {}),
        },
        event: {
          event_ended: {
            lt: now,
            ...(filter.since ? { gte: filter.since } : {}),
          },
          status: { not: EventStatus.Cancelled },
        },
      },
      select: RANKED_ATTENDANCE_SELECT,
    });
  }

  /**
   * Every confirmed donation, with the donor it belongs to — the donor board's raw
   * material. Only CONFIRMED rows count: a pledge that never arrived is not a gift.
   */
  findConfirmedDonations(
    now: Date,
    filter: { since?: Date; userId?: string } = {},
  ): Promise<ConfirmedDonationRow[]> {
    return this.prisma.donation.findMany({
      where: {
        status: DonationStatus.CONFIRMED,
        confirmed_at: {
          lt: now,
          ...(filter.since ? { gte: filter.since } : {}),
        },
        ...(filter.userId ? { user_id: filter.userId } : {}),
      },
      select: CONFIRMED_DONATION_SELECT,
    });
  }

  /** The school's college list — every one is on the department board, even at zero. */
  findDepartments() {
    return this.prisma.department.findMany({
      select: { name: true },
      orderBy: { name: 'asc' },
    });
  }

  findUserDepartment(userId: string) {
    return this.prisma.user.findUnique({
      where: { user_id: userId },
      select: { portal_department: true },
    });
  }
}
