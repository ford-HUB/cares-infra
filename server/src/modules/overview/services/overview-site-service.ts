import { Injectable } from '@nestjs/common';
import {
  AttendanceStatus,
  EventStatus,
  MonthlyReportStatus,
  RoleType,
  type Prisma,
} from '../../../infastructures/prisma/common/client';
import { resolveDepartmentScope } from '../../../shared/constants/departments';
import { DurationUtils } from '../../../shared/utils/duration-utils';
import type {
  AdminOverviewDto,
  AttendanceCountsDto,
  DepartmentOverviewDto,
  EventCountsDto,
} from '../dto/overview-site-dto';
import { OverviewRepository } from '../repositories/overview-repository';
import {
  OVERVIEW_ACTIVITY_LIMIT,
  OVERVIEW_RECENT_DAYS,
} from '../validators/overview-site-validator';

const EMPTY_EVENTS: EventCountsDto = {
  total: 0,
  upcoming: 0,
  ongoing: 0,
  completed: 0,
  cancelled: 0,
  starting_soon: 0,
};

const EMPTY_ATTENDANCE: AttendanceCountsDto = {
  registrations: 0,
  completed: 0,
  pending: 0,
  absent: 0,
  service_hours: 0,
  recent_completed: 0,
};

@Injectable()
export class OverviewSiteService {
  constructor(private readonly repository: OverviewRepository) {}

  async getAdminOverview(): Promise<AdminOverviewDto> {
    const now = new Date();
    const since = recentWindowStart(now);

    const [
      volunteers,
      verifiedVolunteers,
      beneficiaries,
      donors,
      staff,
      newVolunteers,
      events,
      attendance,
      reportsUnderReview,
      openSupportTickets,
      certificatesDistributing,
      activity,
    ] = await Promise.all([
      this.repository.countUsersByRole(RoleType.VOLUNTEER),
      this.repository.countVerifiedVolunteers(),
      this.repository.countUsersByRole(RoleType.BENEFICIARY),
      this.repository.countUsersByRole(RoleType.DONOR),
      this.repository.countStaff(),
      this.repository.countVolunteersCreatedSince(since),
      this.eventCounts(now, since),
      this.attendanceCounts(since),
      this.repository.countReportsUnderReview(),
      this.repository.countOpenSupportTickets(),
      this.repository.countCertificatesDistributing(),
      this.repository.findRecentActivity(OVERVIEW_ACTIVITY_LIMIT),
    ]);

    return {
      recent_days: OVERVIEW_RECENT_DAYS,
      community: {
        volunteers,
        verified_volunteers: verifiedVolunteers,
        beneficiaries,
        donors,
        staff,
        new_volunteers: newVolunteers,
      },
      events,
      attendance,
      queues: {
        reports_under_review: reportsUnderReview,
        open_support_tickets: openSupportTickets,
        certificates_distributing: certificatesDistributing,
      },
      activity: activity.map((entry) => ({
        audit_log_id: entry.audit_log_id,
        description: entry.description,
        actor_name: entry.actor_name,
        category: entry.category,
        outcome: entry.outcome,
        created_at: entry.createdAt.toISOString(),
      })),
      generated_at: now.toISOString(),
    };
  }

  /**
   * Everything scoped to the caller's college: its volunteers, its events and their
   * attendance, and the monthly reports filed under it. A coordinator with no
   * department on their profile gets zeros rather than the whole system — the empty
   * state is the honest answer. When the profile text is not one of the report
   * colleges, reports fall back to the ones this coordinator submitted themselves.
   */
  async getDepartmentOverview(userId: string): Promise<DepartmentOverviewDto> {
    const now = new Date();
    const since = recentWindowStart(now);

    const user = await this.repository.findUserDepartment(userId);
    const department = user?.portal_department?.trim() || null;
    if (!department) {
      return {
        recent_days: OVERVIEW_RECENT_DAYS,
        department: null,
        volunteers: 0,
        new_volunteers: 0,
        events: EMPTY_EVENTS,
        attendance: EMPTY_ATTENDANCE,
        reports: { under_review: 0, approved: 0, returned: 0 },
        generated_at: now.toISOString(),
      };
    }

    const scope = resolveDepartmentScope(department);
    const volunteerScope = this.repository.volunteersInDepartment(
      scope.aliases,
    );
    const eventScope = this.repository.eventsInDepartment(scope.aliases);
    const reportScope: Prisma.MonthlyReportWhereInput = scope.code
      ? { department: scope.code }
      : { submitted_by_user_id: userId };

    const [volunteers, newVolunteers, events, attendance, reports] =
      await Promise.all([
        this.repository.countUsersByRole(RoleType.VOLUNTEER, volunteerScope),
        this.repository.countVolunteersCreatedSince(since, volunteerScope),
        this.eventCounts(now, since, eventScope),
        this.attendanceCounts(since, { event: eventScope }),
        this.repository.countReportsByStatus(reportScope),
      ]);

    return {
      recent_days: OVERVIEW_RECENT_DAYS,
      department,
      volunteers,
      new_volunteers: newVolunteers,
      events,
      attendance,
      reports: {
        under_review: reports.byStatus[MonthlyReportStatus.UNDER_REVIEW] ?? 0,
        approved: reports.byStatus[MonthlyReportStatus.APPROVED] ?? 0,
        returned: reports.byStatus[MonthlyReportStatus.RETURNED] ?? 0,
      },
      generated_at: now.toISOString(),
    };
  }

  private async eventCounts(
    now: Date,
    since: Date,
    where: Prisma.EventWhereInput = {},
  ): Promise<EventCountsDto> {
    // "Soon" mirrors "recent": the same number of days, looking forward.
    const until = new Date(now.getTime() + (now.getTime() - since.getTime()));
    const [counts, startingSoon] = await Promise.all([
      this.repository.countEventsByStatus(now, where),
      this.repository.countEventsStartingBetween(now, until, where),
    ]);
    return {
      total: counts.total,
      upcoming: counts.byStatus[EventStatus.Upcoming] ?? 0,
      ongoing: counts.byStatus[EventStatus.Ongoing] ?? 0,
      completed: counts.byStatus[EventStatus.Completed] ?? 0,
      cancelled: counts.byStatus[EventStatus.Cancelled] ?? 0,
      starting_soon: startingSoon,
    };
  }

  private async attendanceCounts(
    since: Date,
    where: Prisma.EventAttendanceWhereInput = {},
  ): Promise<AttendanceCountsDto> {
    const [totals, recentCompleted] = await Promise.all([
      this.repository.countAttendance(where),
      this.repository.countAttendanceCompletedSince(since, where),
    ]);
    return {
      registrations: totals.total,
      completed: totals.byStatus[AttendanceStatus.COMPLETED] ?? 0,
      pending: totals.byStatus[AttendanceStatus.PENDING] ?? 0,
      absent: totals.byStatus[AttendanceStatus.ABSENT] ?? 0,
      service_hours: Math.round(totals.serviceHours),
      recent_completed: recentCompleted,
    };
  }
}

function recentWindowStart(now: Date): Date {
  return new Date(
    now.getTime() - OVERVIEW_RECENT_DAYS * DurationUtils.ONE_DAY * 1000,
  );
}
