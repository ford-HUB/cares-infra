import { Injectable } from '@nestjs/common';
import {
  EventStatus,
  Prisma,
  RoleType,
} from '../../../infastructures/prisma/common/client';
import { PrismaService } from '../../../infastructures/prisma/prisma-service';

/** Free-text departments, so matched case-insensitively against aliases. */
function departmentIn(aliases: string[]) {
  return { in: aliases, mode: Prisma.QueryMode.insensitive };
}

/** The service buckets in memory: one window is small enough. */
@Injectable()
export class StatisticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  eventsInDepartment(aliases: string[]): Prisma.EventWhereInput {
    return { department: departmentIn(aliases) };
  }

  /** Matches any spelling of the college. */
  volunteersInDepartment(aliases: string[]): Prisma.UserWhereInput {
    return {
      user_school_info: {
        some: { department: { name: departmentIn(aliases) } },
      },
    };
  }

  /** Non-cancelled, ordered by start so buckets come out in axis order. */
  findEventsStartingBetween(
    from: Date,
    to: Date,
    where: Prisma.EventWhereInput = {},
  ) {
    return this.prisma.event.findMany({
      where: {
        ...where,
        status: { not: EventStatus.Cancelled },
        event_started: { gte: from, lte: to },
      },
      orderBy: { event_started: 'asc' },
      select: {
        event_id: true,
        title: true,
        category: true,
        department: true,
        event_started: true,
        event_ended: true,
        attendances: {
          select: {
            user_id: true,
            status: true,
            hours_rendered: true,
            user: {
              select: {
                user_school_info: {
                  select: { year_level: { select: { name: true } } },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });
  }

  /** Status only. */
  findReportsForPeriods(
    periods: string[],
    where: Prisma.MonthlyReportWhereInput,
  ) {
    return this.prisma.monthlyReport.findMany({
      where: { ...where, period: { in: periods } },
      select: { period: true, status: true },
    });
  }

  findVolunteerYearLevels(where: Prisma.UserWhereInput = {}) {
    return this.prisma.userSchoolInfo.findMany({
      where: { user: { ...where, role: { type: RoleType.VOLUNTEER } } },
      select: { user_id: true, year_level: { select: { name: true } } },
    });
  }

  /** Seed order, so the list is stable. */
  findYearLevels() {
    return this.prisma.yearLevel.findMany({
      orderBy: { createdAt: 'asc' },
      select: { name: true },
    });
  }

  findUserDepartment(userId: string) {
    return this.prisma.user.findUnique({
      where: { user_id: userId },
      select: { portal_department: true },
    });
  }
}

export type StatisticsEvent = Awaited<
  ReturnType<StatisticsRepository['findEventsStartingBetween']>
>[number];

export type StatisticsAttendance = StatisticsEvent['attendances'][number];
