import { Injectable } from '@nestjs/common';
import {
  EventStatus,
  Prisma,
  RoleType,
} from '../../../infastructures/prisma/common/client';
import { PrismaService } from '../../../infastructures/prisma/prisma-service';

/**
 * Departments are free text on the profile, the event and the school record, and each
 * spells the college its own way — so a scope is a list of aliases, matched
 * case-insensitively.
 */
function departmentIn(aliases: string[]) {
  return { in: aliases, mode: Prisma.QueryMode.insensitive };
}

/**
 * Row reads for the statistics page. The service does the month bucketing and the
 * ratios: one window of events with their attendance rows is a small enough set
 * that grouping in memory beats a query per chart.
 */
@Injectable()
export class StatisticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  eventsInDepartment(aliases: string[]): Prisma.EventWhereInput {
    return { department: departmentIn(aliases) };
  }

  /** Volunteers whose school record files under any spelling of the college. */
  volunteersInDepartment(aliases: string[]): Prisma.UserWhereInput {
    return {
      user_school_info: {
        some: { department: { name: departmentIn(aliases) } },
      },
    };
  }

  /**
   * Every non-cancelled event that starts inside the window, with each registration's
   * verdict, credited hours and the volunteer's year level. Ordered by start so the
   * month buckets come out in axis order.
   */
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

  /** Monthly reports filed for the given `YYYY-MM` periods, status only. */
  findReportsForPeriods(
    periods: string[],
    where: Prisma.MonthlyReportWhereInput,
  ) {
    return this.prisma.monthlyReport.findMany({
      where: { ...where, period: { in: periods } },
      select: { period: true, status: true },
    });
  }

  /** Each volunteer's year level, for the participation-by-year-level list. */
  findVolunteerYearLevels(where: Prisma.UserWhereInput = {}) {
    return this.prisma.userSchoolInfo.findMany({
      where: { user: { ...where, role: { type: RoleType.VOLUNTEER } } },
      select: { user_id: true, year_level: { select: { name: true } } },
    });
  }

  /** Year levels in the order they were seeded, so the list never reorders between loads. */
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
