import { Injectable } from '@nestjs/common';
import {
  AttendanceStatus,
  CertificateDeploymentStatus,
  EventStatus,
  MonthlyReportStatus,
  Prisma,
  RoleType,
  SupportTicketStatus,
  VerificationStatus,
} from '../../../infastructures/prisma/common/client';
import { PrismaService } from '../../../infastructures/prisma/prisma-service';
import { PORTAL_ROLE_TYPES } from '../../../shared/constants/portal-role-types';

export interface StatusCounts<S extends string> {
  byStatus: Partial<Record<S, number>>;
  total: number;
}

export interface AttendanceTotals extends StatusCounts<AttendanceStatus> {
  serviceHours: number;
}

/** Support states still waiting on staff — resolved and closed tickets are done. */
const OPEN_TICKET_STATUSES: SupportTicketStatus[] = [
  SupportTicketStatus.OPEN,
  SupportTicketStatus.IN_PROGRESS,
  SupportTicketStatus.UNDER_VERIFICATION,
  SupportTicketStatus.CLIENT_FEEDBACK,
];

/**
 * Departments are free text on the profile, the event and the school record, and each
 * spells the college its own way — so a scope is a list of aliases, matched
 * case-insensitively.
 */
function departmentIn(aliases: string[]) {
  return { in: aliases, mode: Prisma.QueryMode.insensitive };
}

/**
 * Read-only aggregates for the dashboards. Every method is a count or a sum — the
 * overview never lists rows, that is what the feature pages are for.
 */
@Injectable()
export class OverviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  countUsersByRole(role: RoleType, where: Prisma.UserWhereInput = {}) {
    return this.prisma.user.count({
      where: { ...where, role: { type: role } },
    });
  }

  countStaff() {
    return this.prisma.user.count({
      where: { role: { type: { in: [...PORTAL_ROLE_TYPES] } } },
    });
  }

  countVerifiedVolunteers() {
    return this.prisma.user.count({
      where: {
        role: { type: RoleType.VOLUNTEER },
        user_verifications: { some: { status: VerificationStatus.V } },
      },
    });
  }

  countVolunteersCreatedSince(since: Date, where: Prisma.UserWhereInput = {}) {
    return this.countUsersByRole(RoleType.VOLUNTEER, {
      ...where,
      createdAt: { gte: since },
    });
  }

  /** Volunteers whose school record files under any spelling of the college. */
  volunteersInDepartment(aliases: string[]): Prisma.UserWhereInput {
    return {
      user_school_info: {
        some: { department: { name: departmentIn(aliases) } },
      },
    };
  }

  eventsInDepartment(aliases: string[]): Prisma.EventWhereInput {
    return { department: departmentIn(aliases) };
  }

  /**
   * The stored `status` never moves on its own — an event created as Upcoming stays
   * Upcoming in the row after it has run. Status is therefore derived from the
   * timestamps, the same rule the portal's events grid applies: Cancelled is kept,
   * everything else is Upcoming / Ongoing / Completed by where `now` falls.
   */
  async countEventsByStatus(
    now: Date,
    where: Prisma.EventWhereInput = {},
  ): Promise<StatusCounts<EventStatus>> {
    const notCancelled: Prisma.EventWhereInput = {
      ...where,
      status: { not: EventStatus.Cancelled },
    };
    const [cancelled, upcoming, ongoing, completed] = await Promise.all([
      this.prisma.event.count({
        where: { ...where, status: EventStatus.Cancelled },
      }),
      this.prisma.event.count({
        where: { ...notCancelled, event_started: { gt: now } },
      }),
      this.prisma.event.count({
        where: {
          ...notCancelled,
          event_started: { lte: now },
          event_ended: { gte: now },
        },
      }),
      this.prisma.event.count({
        where: { ...notCancelled, event_ended: { lt: now } },
      }),
    ]);
    return collectStatusCounts([
      [EventStatus.Cancelled, cancelled],
      [EventStatus.Upcoming, upcoming],
      [EventStatus.Ongoing, ongoing],
      [EventStatus.Completed, completed],
    ]);
  }

  countEventsStartingBetween(
    from: Date,
    to: Date,
    where: Prisma.EventWhereInput = {},
  ) {
    return this.prisma.event.count({
      where: {
        ...where,
        status: { not: EventStatus.Cancelled },
        event_started: { gte: from, lte: to },
      },
    });
  }

  async countAttendance(
    where: Prisma.EventAttendanceWhereInput = {},
  ): Promise<AttendanceTotals> {
    const [groups, hours] = await Promise.all([
      this.prisma.eventAttendance.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
      this.prisma.eventAttendance.aggregate({
        where: { ...where, status: AttendanceStatus.COMPLETED },
        _sum: { hours_rendered: true },
      }),
    ]);
    return {
      ...collectStatusCounts(
        groups.map((group) => [group.status, group._count._all]),
      ),
      serviceHours: hours._sum.hours_rendered ?? 0,
    };
  }

  /** Rows judged COMPLETED since the given moment — the last write on a row is its verdict. */
  countAttendanceCompletedSince(
    since: Date,
    where: Prisma.EventAttendanceWhereInput = {},
  ) {
    return this.prisma.eventAttendance.count({
      where: {
        ...where,
        status: AttendanceStatus.COMPLETED,
        updatedAt: { gte: since },
      },
    });
  }

  countReportsUnderReview() {
    return this.prisma.monthlyReport.count({
      where: { status: MonthlyReportStatus.UNDER_REVIEW },
    });
  }

  async countReportsByStatus(
    where: Prisma.MonthlyReportWhereInput,
  ): Promise<StatusCounts<MonthlyReportStatus>> {
    const groups = await this.prisma.monthlyReport.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    });
    return collectStatusCounts(
      groups.map((group) => [group.status, group._count._all]),
    );
  }

  countOpenSupportTickets() {
    return this.prisma.supportTicket.count({
      where: { status: { in: OPEN_TICKET_STATUSES } },
    });
  }

  countCertificatesDistributing() {
    return this.prisma.certificateDeployment.count({
      where: { status: CertificateDeploymentStatus.DISTRIBUTING },
    });
  }

  findRecentActivity(limit: number) {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        audit_log_id: true,
        description: true,
        actor_name: true,
        category: true,
        outcome: true,
        createdAt: true,
      },
    });
  }

  findUserDepartment(userId: string) {
    return this.prisma.user.findUnique({
      where: { user_id: userId },
      select: { portal_department: true },
    });
  }
}

function collectStatusCounts<S extends string>(
  pairs: [S, number][],
): StatusCounts<S> {
  const byStatus: Partial<Record<S, number>> = {};
  let total = 0;
  for (const [status, count] of pairs) {
    byStatus[status] = count;
    total += count;
  }
  return { byStatus, total };
}
