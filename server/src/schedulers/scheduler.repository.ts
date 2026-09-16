import { Injectable } from '@nestjs/common';
import {
  EventStatus,
  NotificationTone,
  ReportDepartment,
  RoleType,
} from '../infastructures/prisma/common/client';
import { PrismaService } from '../infastructures/prisma/prisma-service';
import { DEPARTMENT_ALIASES } from '../shared/constants/departments';
import { PORTAL_ROLE_TYPES } from '../shared/constants/portal-role-types';

/**
 * The reads the sweeps need across other modules' tables. Kept here rather than in
 * each feature's repository because the questions are the scheduler's ("what starts
 * in the next two hours?"), not the feature's, and no request handler asks them.
 */
@Injectable()
export class SchedulerRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Upcoming events whose start falls inside the window. */
  async findEventsStartingBetween(from: Date, to: Date) {
    return this.prisma.event.findMany({
      where: {
        status: EventStatus.Upcoming,
        event_started: { gte: from, lte: to },
      },
      select: {
        event_id: true,
        title: true,
        event_started: true,
        department: true,
      },
    });
  }

  /**
   * Coordinators of one college, matched against every spelling the profile might
   * carry. Null department means the event is for everyone.
   */
  async findCoordinatorIdsForDepartment(
    department: string | null,
  ): Promise<string[]> {
    const aliases = department ? aliasesFor(department) : null;
    const users = await this.prisma.user.findMany({
      where: {
        role: { type: RoleType.COORDINATOR },
        accounts: { some: { is_restricted: false } },
        ...(aliases
          ? { portal_department: { in: aliases, mode: 'insensitive' } }
          : {}),
      },
      select: { user_id: true },
    });
    return users.map((user) => user.user_id);
  }

  /** Which colleges have filed a report for the period, whatever its review state. */
  async findDepartmentsReportedFor(
    period: string,
  ): Promise<ReportDepartment[]> {
    const rows = await this.prisma.monthlyReport.findMany({
      where: { period },
      select: { department: true },
      distinct: ['department'],
    });
    return rows.map((row) => row.department);
  }

  /** Administrator-issued credentials that lapse inside the window. */
  async findCredentialsExpiringBetween(from: Date, to: Date) {
    return this.prisma.account.findMany({
      where: {
        is_restricted: false,
        credential_expires_at: { gte: from, lte: to },
      },
      select: {
        account_id: true,
        email: true,
        credential_expires_at: true,
        user_id: true,
        user: { select: { firstname: true, lastname: true } },
      },
    });
  }

  /**
   * Portal users with unread notices worth a morning email, and the notices. Info-tone
   * rows are left out: they are the feed's ambient chatter, not something to chase.
   */
  async findUnreadDigests(since: Date) {
    const accounts = await this.prisma.account.findMany({
      where: {
        is_restricted: false,
        user: {
          role: { type: { in: [...PORTAL_ROLE_TYPES] } },
          notifications: {
            some: {
              read_at: null,
              dismissed_at: null,
              createdAt: { gte: since },
              tone: {
                in: [NotificationTone.ATTENTION, NotificationTone.CRITICAL],
              },
            },
          },
        },
      },
      select: {
        email: true,
        user: {
          select: {
            firstname: true,
            notifications: {
              where: {
                read_at: null,
                dismissed_at: null,
                createdAt: { gte: since },
                tone: {
                  in: [NotificationTone.ATTENTION, NotificationTone.CRITICAL],
                },
              },
              orderBy: { createdAt: 'desc' },
              select: { title: true, tone: true },
            },
          },
        },
      },
    });

    return accounts.map((account) => ({
      email: account.email,
      firstname: account.user.firstname,
      notifications: account.user.notifications,
    }));
  }
}

function aliasesFor(department: string): string[] {
  const needle = department.trim().toLowerCase();
  for (const aliases of Object.values(DEPARTMENT_ALIASES)) {
    if (aliases.some((alias) => alias.toLowerCase() === needle)) {
      return [...aliases];
    }
  }
  return [department.trim()];
}
