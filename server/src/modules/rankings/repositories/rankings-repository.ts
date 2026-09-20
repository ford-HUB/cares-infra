import { Injectable } from '@nestjs/common';
import {
  AttendanceStatus,
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

/**
 * How the events form marks an event open to every college. Such events, and
 * older ones with no department at all, count for every coordinator's board.
 */
const SCHOOL_WIDE_DEPARTMENT = 'All Departments';

export interface RankedAttendanceFilter {
  /** Only events that ended at or after this moment. */
  since?: Date;
  /** Only one volunteer's rows — for a profile's own tally. */
  userId?: string;
  /**
   * Only events filed under one of these spellings of a college — plus the
   * school-wide ones, which every college's volunteers were invited to.
   */
  eventDepartments?: string[];
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
        user: { role: { type: RoleType.VOLUNTEER } },
        event: {
          event_ended: {
            lt: now,
            ...(filter.since ? { gte: filter.since } : {}),
          },
          status: { not: EventStatus.Cancelled },
          ...(filter.eventDepartments
            ? {
                OR: [
                  {
                    department: {
                      in: [...filter.eventDepartments, SCHOOL_WIDE_DEPARTMENT],
                      mode: Prisma.QueryMode.insensitive,
                    },
                  },
                  { department: null },
                ],
              }
            : {}),
        },
      },
      select: RANKED_ATTENDANCE_SELECT,
    });
  }

  findUserDepartment(userId: string) {
    return this.prisma.user.findUnique({
      where: { user_id: userId },
      select: { portal_department: true },
    });
  }
}
