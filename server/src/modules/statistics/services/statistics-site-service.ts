import { Injectable } from '@nestjs/common';
import {
  AttendanceStatus,
  MonthlyReportStatus,
  RoleType,
  type Prisma,
} from '../../../infastructures/prisma/common/client';
import { resolveDepartmentScope } from '../../../shared/constants/departments';
import type {
  CategoryActivityDto,
  DepartmentActivityDto,
  MonthlyActivityDto,
  MonthlyReportActivityDto,
  StatisticSummaryDto,
  StatisticsQueryDto,
  StatisticsResponseDto,
  TopEventDto,
  YearLevelParticipationDto,
} from '../dto/statistics-site-dto';
import {
  StatisticsRepository,
  type StatisticsAttendance,
  type StatisticsEvent,
} from '../repositories/statistics-repository';
import {
  STATISTICS_ALL,
  STATISTICS_RANGE_MONTHS,
  STATISTICS_TOP_EVENTS,
} from '../validators/statistics-site-validator';

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** Events with no college on the row, in the per-department breakdown. */
const UNASSIGNED_DEPARTMENT = 'All Departments';

/** Volunteers whose school record carries no year level. */
const UNKNOWN_YEAR_LEVEL = 'Unspecified';

/** First day of the month `offset` months after `date`'s month, at midnight. */
function startOfMonth(date: Date, offset = 0): Date {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

function periodKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** Whole-window sum plus the per-month trend, against the previous window. */
function summarise(current: number[], previous: number[]): StatisticSummaryDto {
  const sum = (values: number[]) => values.reduce((total, v) => total + v, 0);
  return {
    value: sum(current),
    previous: previous.length ? sum(previous) : null,
    trend: current,
  };
}

function rate(numerator: number, denominator: number): number {
  return denominator > 0
    ? Math.round((numerator / denominator) * 1000) / 10
    : 0;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function isCompleted(row: StatisticsAttendance): boolean {
  return row.status === AttendanceStatus.COMPLETED;
}

function hoursOf(row: StatisticsAttendance): number {
  return isCompleted(row) ? (row.hours_rendered ?? 0) : 0;
}

interface MonthBucket {
  period: string;
  label: string;
  events: StatisticsEvent[];
}

/**
 * The Statistics page in numbers. Everything is bucketed by the month an event
 * starts in; "held" additionally requires the event to have ended, so a month in
 * progress never claims events still to come. The previous window of the same
 * length gives every headline its movement.
 */
@Injectable()
export class StatisticsSiteService {
  constructor(private readonly repository: StatisticsRepository) {}

  /**
   * Admin and director read the whole system, narrowed by the query's department.
   * A coordinator is always scoped to the college on their profile; with none set
   * they get an empty page rather than the whole system.
   */
  async getStatistics(
    userId: string,
    role: RoleType,
    query: StatisticsQueryDto,
  ): Promise<StatisticsResponseDto> {
    if (role === RoleType.COORDINATOR) {
      const user = await this.repository.findUserDepartment(userId);
      const department = user?.portal_department?.trim() || null;
      return department
        ? this.build(department, query, userId)
        : this.empty(query);
    }
    const department =
      query.department.toLowerCase() === STATISTICS_ALL
        ? null
        : query.department;
    return this.build(department, query, userId);
  }

  private async build(
    department: string | null,
    query: StatisticsQueryDto,
    userId: string,
  ): Promise<StatisticsResponseDto> {
    const now = new Date();
    const months = STATISTICS_RANGE_MONTHS[query.range];
    const currentStart = startOfMonth(now, -(months - 1));
    const previousStart = startOfMonth(now, -(months * 2 - 1));

    const scope = department ? resolveDepartmentScope(department) : null;
    const eventScope: Prisma.EventWhereInput = {
      ...(scope ? this.repository.eventsInDepartment(scope.aliases) : {}),
      ...(query.category.toLowerCase() === STATISTICS_ALL
        ? {}
        : { category: { equals: query.category, mode: 'insensitive' } }),
    };
    const volunteerScope: Prisma.UserWhereInput = scope
      ? this.repository.volunteersInDepartment(scope.aliases)
      : {};
    // Reports carry the college as an enum; a coordinator whose profile text is not
    // one of those colleges falls back to the reports they filed themselves.
    const reportScope: Prisma.MonthlyReportWhereInput = !scope
      ? {}
      : scope.code
        ? { department: scope.code }
        : { submitted_by_user_id: userId };

    const currentPeriods = Array.from({ length: months }, (_, i) =>
      periodKey(startOfMonth(currentStart, i)),
    );

    const [events, reports, yearLevels, volunteerLevels] = await Promise.all([
      this.repository.findEventsStartingBetween(previousStart, now, eventScope),
      this.repository.findReportsForPeriods(currentPeriods, reportScope),
      this.repository.findYearLevels(),
      this.repository.findVolunteerYearLevels(volunteerScope),
    ]);

    const current = this.bucket(events, currentStart, months);
    const previous = this.bucket(events, previousStart, months, currentStart);
    const currentEvents = current.flatMap((bucket) => bucket.events);

    const monthly = current.map((bucket) => this.monthlyRow(bucket, now));
    const previousMonthly = previous.map((bucket) =>
      this.monthlyRow(bucket, now),
    );

    const activeVolunteers = (buckets: MonthBucket[]) =>
      buckets.map((bucket) => this.activeVolunteers(bucket.events).size);
    const attendanceRate = (rows: MonthlyActivityDto[]) =>
      rate(
        rows.reduce((sum, row) => sum + row.attended, 0),
        rows.reduce((sum, row) => sum + row.registrations, 0),
      );

    return {
      department,
      range: query.range,
      summary: {
        events_held: summarise(
          monthly.map((row) => row.events_held),
          previousMonthly.map((row) => row.events_held),
        ),
        active_volunteers: {
          // Distinct across the whole window, not the sum of the monthly points — a
          // volunteer active in two months is still one volunteer.
          value: this.activeVolunteers(currentEvents).size,
          previous: this.activeVolunteers(
            previous.flatMap((bucket) => bucket.events),
          ).size,
          trend: activeVolunteers(current),
        },
        attendance_rate: {
          value: attendanceRate(monthly),
          previous: attendanceRate(previousMonthly),
          trend: monthly.map((row) => rate(row.attended, row.registrations)),
        },
        service_hours: summarise(
          monthly.map((row) => row.service_hours),
          previousMonthly.map((row) => row.service_hours),
        ),
      },
      monthly,
      categories: this.categories(currentEvents),
      reports: this.reports(current, reports),
      year_levels: this.yearLevels(
        yearLevels.map((level) => level.name),
        volunteerLevels,
        currentEvents,
      ),
      top_events: this.topEvents(currentEvents),
      departments: department ? [] : this.departments(currentEvents),
      generated_at: now.toISOString(),
    };
  }

  /** The page with nothing in it — a coordinator with no college on their profile. */
  private empty(query: StatisticsQueryDto): StatisticsResponseDto {
    const now = new Date();
    const months = STATISTICS_RANGE_MONTHS[query.range];
    const buckets = this.bucket([], startOfMonth(now, -(months - 1)), months);
    const zero: StatisticSummaryDto = {
      value: 0,
      previous: null,
      trend: buckets.map(() => 0),
    };
    return {
      department: null,
      range: query.range,
      summary: {
        events_held: zero,
        active_volunteers: zero,
        attendance_rate: zero,
        service_hours: zero,
      },
      monthly: buckets.map((bucket) => this.monthlyRow(bucket, now)),
      categories: [],
      reports: this.reports(buckets, []),
      year_levels: [],
      top_events: [],
      departments: [],
      generated_at: now.toISOString(),
    };
  }

  /** One bucket per month from `start`, holding the events that start in it. */
  private bucket(
    events: StatisticsEvent[],
    start: Date,
    months: number,
    end?: Date,
  ): MonthBucket[] {
    const buckets = Array.from({ length: months }, (_, i) => {
      const month = startOfMonth(start, i);
      return {
        period: periodKey(month),
        label: MONTH_LABELS[month.getMonth()],
        events: [] as StatisticsEvent[],
      };
    });
    const byPeriod = new Map(buckets.map((bucket) => [bucket.period, bucket]));
    for (const event of events) {
      if (event.event_started < start) continue;
      if (end && event.event_started >= end) continue;
      byPeriod.get(periodKey(event.event_started))?.events.push(event);
    }
    return buckets;
  }

  private monthlyRow(bucket: MonthBucket, now: Date): MonthlyActivityDto {
    const rows = bucket.events.flatMap((event) => event.attendances);
    return {
      period: bucket.period,
      label: bucket.label,
      events_held: bucket.events.filter((event) => event.event_ended <= now)
        .length,
      registrations: rows.length,
      attended: rows.filter(isCompleted).length,
      service_hours: round(rows.reduce((sum, row) => sum + hoursOf(row), 0)),
    };
  }

  /** Volunteers with at least one completed attendance across the given events. */
  private activeVolunteers(events: StatisticsEvent[]): Set<string> {
    const ids = new Set<string>();
    for (const event of events) {
      for (const row of event.attendances) {
        if (isCompleted(row)) ids.add(row.user_id);
      }
    }
    return ids;
  }

  private categories(events: StatisticsEvent[]): CategoryActivityDto[] {
    const groups = new Map<string, CategoryActivityDto>();
    for (const event of events) {
      const name = event.category.trim() || 'Others';
      const key = name.toLowerCase();
      const group = groups.get(key) ?? {
        category: name,
        events: 0,
        registrations: 0,
        outcomes: { completed: 0, pending: 0, absent: 0 },
      };
      group.events += 1;
      for (const row of event.attendances) {
        group.registrations += 1;
        if (row.status === AttendanceStatus.COMPLETED) {
          group.outcomes.completed += 1;
        } else if (row.status === AttendanceStatus.ABSENT) {
          group.outcomes.absent += 1;
        } else {
          group.outcomes.pending += 1;
        }
      }
      groups.set(key, group);
    }
    return [...groups.values()].sort((a, b) => b.events - a.events);
  }

  private reports(
    buckets: MonthBucket[],
    rows: { period: string; status: MonthlyReportStatus }[],
  ): MonthlyReportActivityDto[] {
    return buckets.map((bucket) => {
      const outcomes = { approved: 0, under_review: 0, returned: 0 };
      for (const row of rows) {
        if (row.period !== bucket.period) continue;
        if (row.status === MonthlyReportStatus.APPROVED) outcomes.approved += 1;
        else if (row.status === MonthlyReportStatus.RETURNED)
          outcomes.returned += 1;
        else outcomes.under_review += 1;
      }
      return { period: bucket.period, label: bucket.label, outcomes };
    });
  }

  /**
   * Every year level the school holds, with how many of the scope's volunteers sit
   * in it and how many of those attended something this period. A level nobody is
   * in still lists at zero, so the chart keeps its shape between colleges.
   */
  private yearLevels(
    levels: string[],
    volunteers: { user_id: string; year_level: { name: string } }[],
    events: StatisticsEvent[],
  ): YearLevelParticipationDto[] {
    const active = this.activeVolunteers(events);
    const counts = new Map<string, { volunteers: number; active: number }>(
      levels.map((name) => [name, { volunteers: 0, active: 0 }]),
    );
    for (const volunteer of volunteers) {
      const name = volunteer.year_level.name || UNKNOWN_YEAR_LEVEL;
      const count = counts.get(name) ?? { volunteers: 0, active: 0 };
      count.volunteers += 1;
      if (active.has(volunteer.user_id)) count.active += 1;
      counts.set(name, count);
    }
    return [...counts.entries()].map(([year_level, count]) => ({
      year_level,
      ...count,
    }));
  }

  private topEvents(events: StatisticsEvent[]): TopEventDto[] {
    return events
      .map((event) => ({
        event_id: event.event_id,
        title: event.title,
        category: event.category,
        date: event.event_started.toISOString(),
        registrations: event.attendances.length,
        attended: event.attendances.filter(isCompleted).length,
        service_hours: round(
          event.attendances.reduce((sum, row) => sum + hoursOf(row), 0),
        ),
      }))
      .sort(
        (a, b) => b.attended - a.attended || b.registrations - a.registrations,
      )
      .slice(0, STATISTICS_TOP_EVENTS);
  }

  /** How the whole splits by college — the event's own department, as written. */
  private departments(events: StatisticsEvent[]): DepartmentActivityDto[] {
    const groups = new Map<string, DepartmentActivityDto>();
    for (const event of events) {
      const name = event.department?.trim() || UNASSIGNED_DEPARTMENT;
      const key = name.toLowerCase();
      const group = groups.get(key) ?? {
        department: name,
        events: 0,
        registrations: 0,
        attended: 0,
        service_hours: 0,
      };
      group.events += 1;
      group.registrations += event.attendances.length;
      group.attended += event.attendances.filter(isCompleted).length;
      group.service_hours = round(
        group.service_hours +
          event.attendances.reduce((sum, row) => sum + hoursOf(row), 0),
      );
      groups.set(key, group);
    }
    return [...groups.values()].sort((a, b) => b.attended - a.attended);
  }
}
