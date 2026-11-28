import { Injectable } from '@nestjs/common';
import {
  AttendanceStatus,
  DonationStatus,
  EventStatus,
  Prisma,
  RoleType,
} from '../../../infastructures/prisma/common/client';
import { PrismaService } from '../../../infastructures/prisma/prisma-service';

const RANKED_ATTENDANCE_SELECT = {
  status: true,
  hours_rendered: true,
  participation_role: true,
  role_approval: true,
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

const CONFIRMED_DONATION_SELECT = {
  kind: true,
  amount: true,
  confirmed_at: true,
  /** Credits the department board. */
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
  /** Events ended at or after this. */
  since?: Date;
  userId?: string;
  /** By the volunteer's assigned college (any spelling), not events attended. */
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

  /** Single row, created on first save. */
  async saveSettings(data: {
    points_per_attendance: number;
    absence_penalty_step: number;
    absence_reset_days: number;
    participation_role_points: Prisma.InputJsonValue;
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

  /** COMPLETED / ABSENT on ended, non-cancelled events; PENDING excluded (unsynced isn't a miss). */
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

  /** CONFIRMED only: an unarrived pledge isn't a gift. */
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

  /** Every college appears, even at zero. */
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
