import { Injectable } from '@nestjs/common';
import {
  AttendanceStatus,
  DonationStatus,
  EventStatus,
  NotificationTone,
  ReportDepartment,
  RoleType,
} from '../infastructures/prisma/common/client';
import { PrismaService } from '../infastructures/prisma/prisma-service';
import { DEPARTMENT_ALIASES } from '../shared/constants/departments';
import { PORTAL_ROLE_TYPES } from '../shared/constants/portal-role-types';

/** Cross-module reads that only the sweeps ask. */
@Injectable()
export class SchedulerRepository {
  constructor(private readonly prisma: PrismaService) {}

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

  /** Registered and not yet ruled on. */
  async findRegisteredVolunteerIds(eventId: number): Promise<string[]> {
    const rows = await this.prisma.eventAttendance.findMany({
      where: { event_id: eventId, status: AttendanceStatus.PENDING },
      select: { user_id: true },
    });
    return rows.map((row) => row.user_id);
  }

  /** Registered volunteers, accepted beneficiaries, donors with a live donation. Ruled attendance included. */
  async findEventParticipantIds(eventId: number): Promise<{
    volunteers: string[];
    beneficiaries: string[];
    donors: string[];
  }> {
    const [attendance, requests, donations] = await Promise.all([
      this.prisma.eventAttendance.findMany({
        where: { event_id: eventId },
        select: { user_id: true },
      }),
      this.prisma.userRequest.findMany({
        where: { event_id: eventId, kind: 'EVENT_JOIN', status: 'ACCEPTED' },
        select: { user_id: true },
      }),
      this.prisma.donation.findMany({
        where: {
          event_id: eventId,
          status: {
            notIn: [DonationStatus.CANCELLED, DonationStatus.DECLINED],
          },
        },
        select: { user_id: true },
      }),
    ]);
    const ids = (rows: { user_id: string }[]) => [
      ...new Set(rows.map((row) => row.user_id)),
    ];
    return {
      volunteers: ids(attendance),
      beneficiaries: ids(requests),
      donors: ids(donations),
    };
  }

  async findAcceptedBeneficiaryIds(eventId: number): Promise<string[]> {
    const rows = await this.prisma.userRequest.findMany({
      where: { event_id: eventId, kind: 'EVENT_JOIN', status: 'ACCEPTED' },
      select: { user_id: true },
    });
    return [...new Set(rows.map((row) => row.user_id))];
  }

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

  /** Any review state. */
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

  /** Info-tone rows excluded. */
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
