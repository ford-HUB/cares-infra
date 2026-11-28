import { Injectable } from '@nestjs/common';
import {
  EventParticipationRole,
  EventRoleApproval,
  EventStatus,
  Prisma,
  RoleType,
  UserRequestKind,
} from '../../../infastructures/prisma/common/client';
import { PrismaService } from '../../../infastructures/prisma/prisma-service';
import { PersistEventDto } from '../dto/events-site-dto';

/** Rolls back the register transaction when full. */
class EventFullError extends Error {}

/** e.g. `ORGANIZER` → `Organizer`. */
export function participationRoleLabel(role: EventParticipationRole): string {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

@Injectable()
export class EventsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.event.findMany({
      orderBy: { event_started: 'desc' },
    });
  }

  /** Newest school record; null when none. */
  async findUserDepartment(userId: string): Promise<string | null> {
    const row = await this.prisma.userSchoolInfo.findFirst({
      where: { user_id: userId },
      select: { department: { select: { name: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    return row?.department.name ?? null;
  }

  /** Unrestricted [role] holders matching any department spelling. */
  async findDepartmentMemberIds(
    role: RoleType,
    departmentAliases: string[],
  ): Promise<string[]> {
    if (departmentAliases.length === 0) return [];
    const accounts = await this.prisma.account.findMany({
      where: {
        is_restricted: false,
        user: {
          role: { type: role },
          user_school_info: {
            some: {
              department: {
                OR: departmentAliases.map((alias) => ({
                  name: { equals: alias, mode: 'insensitive' as const },
                })),
              },
            },
          },
        },
      },
      select: { user_id: true },
      distinct: ['user_id'],
    });
    return accounts.map((account) => account.user_id);
  }

  /** Soonest first, with live counts and joined state. [audience] scopes department-only School events. */
  async findOpenForVolunteers(
    userId: string,
    audience: Prisma.EventWhereInput,
  ) {
    return this.prisma.event.findMany({
      where: {
        status: { in: [EventStatus.Upcoming, EventStatus.Ongoing] },
        event_ended: { gte: new Date() },
        AND: [audience],
      },
      include: {
        _count: { select: { attendances: true } },
        attendances: {
          where: { user_id: userId },
          select: {
            event_attendance_id: true,
            status: true,
            participation_role: true,
            role_approval: true,
          },
        },
      },
      orderBy: { event_started: 'asc' },
    });
  }

  /** Same row shape as the volunteer pool; the per-user slice is empty. */
  async findOpenForBeneficiaries(
    userId: string,
    audience: Prisma.EventWhereInput,
  ) {
    return this.prisma.event.findMany({
      where: {
        status: { in: [EventStatus.Upcoming, EventStatus.Ongoing] },
        event_ended: { gte: new Date() },
        beneficiary_applicable: true,
        AND: [audience],
      },
      include: {
        _count: { select: { attendances: true } },
        attendances: {
          where: { user_id: userId },
          select: {
            event_attendance_id: true,
            status: true,
            participation_role: true,
            role_approval: true,
          },
        },
      },
      orderBy: { event_started: 'asc' },
    });
  }

  /** Same row shape as the volunteer pool; the per-user slice is empty. */
  async findOpenForDonors(userId: string, audience: Prisma.EventWhereInput) {
    return this.prisma.event.findMany({
      where: {
        status: { in: [EventStatus.Upcoming, EventStatus.Ongoing] },
        event_ended: { gte: new Date() },
        OR: [{ funds_donation: true }, { goods_donation: true }],
        AND: [audience],
      },
      include: {
        _count: { select: { attendances: true } },
        attendances: {
          where: { user_id: userId },
          select: {
            event_attendance_id: true,
            status: true,
            participation_role: true,
            role_approval: true,
          },
        },
      },
      orderBy: { event_started: 'asc' },
    });
  }

  /** Completed or past end, latest first; cancelled excluded. */
  async findCompletedForBeneficiaries(
    userId: string,
    audience: Prisma.EventWhereInput,
  ) {
    return this.prisma.event.findMany({
      where: {
        beneficiary_applicable: true,
        status: { not: EventStatus.Cancelled },
        OR: [
          { status: EventStatus.Completed },
          { event_ended: { lt: new Date() } },
        ],
        AND: [audience],
      },
      include: {
        _count: { select: { attendances: true } },
        attendances: {
          where: { user_id: userId },
          select: {
            event_attendance_id: true,
            status: true,
            participation_role: true,
            role_approval: true,
          },
        },
      },
      orderBy: { event_started: 'desc' },
    });
  }

  /** Newest first so the latest filing wins; removed requests excluded. */
  async findBeneficiaryApplications(userId: string, eventIds: number[]) {
    if (eventIds.length === 0) return [];
    return this.prisma.userRequest.findMany({
      where: {
        user_id: userId,
        kind: 'EVENT_JOIN',
        event_id: { in: eventIds },
        status: { in: ['PENDING', 'ACCEPTED', 'REJECTED'] },
      },
      select: { event_id: true, status: true, rejection_reason: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Includes finished events; cancelled excluded. */
  async findRegisteredForVolunteer(userId: string) {
    return this.prisma.event.findMany({
      where: {
        status: { not: EventStatus.Cancelled },
        attendances: { some: { user_id: userId } },
      },
      include: {
        _count: { select: { attendances: true } },
        attendances: {
          where: { user_id: userId },
          select: {
            event_attendance_id: true,
            status: true,
            participation_role: true,
            role_approval: true,
          },
        },
      },
      orderBy: { event_started: 'desc' },
    });
  }

  async findParticipants(eventId: number) {
    return this.prisma.eventAttendance.findMany({
      where: { event_id: eventId },
      select: {
        user_id: true,
        status: true,
        participation_role: true,
        role_approval: true,
        user: { select: { firstname: true, lastname: true } },
      },
      orderBy: { registered_at: 'asc' },
    });
  }

  /**
   * Serializable so racers can't both take the last slot; caller retries on serialization failure.
   * Null when full; idempotent when already registered. Non-REGULAR roles are held PENDING with
   * an EVENT_ROLE request in the same transaction.
   */
  async register(
    eventId: number,
    userId: string,
    role: EventParticipationRole,
  ) {
    return this.prisma
      .$transaction(
        async (tx) => {
          const existing = await tx.eventAttendance.findUnique({
            where: { event_id_user_id: { event_id: eventId, user_id: userId } },
            select: { participation_role: true, role_approval: true },
          });
          const needsApproval = role !== EventParticipationRole.REGULAR;
          const attendance =
            existing ??
            (await tx.eventAttendance.create({
              data: {
                event_id: eventId,
                user_id: userId,
                participation_role: role,
                role_approval: needsApproval
                  ? EventRoleApproval.PENDING
                  : EventRoleApproval.APPROVED,
              },
              select: { participation_role: true, role_approval: true },
            }));

          const participants = await tx.eventAttendance.count({
            where: { event_id: eventId },
          });
          const event = await tx.event.findUniqueOrThrow({
            where: { event_id: eventId },
            select: { max_participants: true, title: true },
          });
          if (!existing && participants > event.max_participants) {
            // Throwing discards the transaction; mapped to null below.
            throw new EventFullError();
          }

          if (!existing && needsApproval) {
            const user = await tx.user.findUniqueOrThrow({
              where: { user_id: userId },
              select: { firstname: true, lastname: true },
            });
            const roleLabel = participationRoleLabel(role);
            await tx.userRequest.create({
              data: {
                kind: UserRequestKind.EVENT_ROLE,
                user_id: userId,
                event_id: eventId,
                participation_role: role,
                summary: `Requests to serve as ${roleLabel} for ${event.title}.`,
                trail: {
                  create: {
                    label: `Registered for the event as ${roleLabel} — pending approval`,
                    actor_name:
                      `${user.firstname} ${user.lastname}`.trim() ||
                      'Volunteer',
                  },
                },
              },
            });
          }

          await tx.event.update({
            where: { event_id: eventId },
            data: { participants },
          });
          return {
            participants,
            max_participants: event.max_participants,
            participation_role: attendance.participation_role,
            role_approval: attendance.role_approval,
            /** False when already registered. */
            created: !existing,
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      )
      .catch((error: unknown) => {
        if (error instanceof EventFullError) return null;
        throw error;
      });
  }

  /** Also withdraws a pending role request. */
  async unregister(eventId: number, userId: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const removed = await tx.eventAttendance.deleteMany({
          where: { event_id: eventId, user_id: userId },
        });
        if (removed.count > 0) {
          const pending = await tx.userRequest.findMany({
            where: {
              user_id: userId,
              event_id: eventId,
              kind: UserRequestKind.EVENT_ROLE,
              status: 'PENDING',
            },
            select: {
              user_request_id: true,
              user: { select: { firstname: true, lastname: true } },
            },
          });
          for (const request of pending) {
            await tx.userRequest.update({
              where: { user_request_id: request.user_request_id },
              data: {
                status: 'DELETED',
                trail: {
                  create: {
                    label:
                      'Withdrawn — the volunteer cancelled their registration',
                    actor_name:
                      `${request.user.firstname} ${request.user.lastname}`.trim() ||
                      'Volunteer',
                  },
                },
              },
            });
          }
        }
        const participants = await tx.eventAttendance.count({
          where: { event_id: eventId },
        });
        const event = await tx.event.update({
          where: { event_id: eventId },
          data: { participants },
          select: { max_participants: true },
        });
        return {
          participants,
          max_participants: event.max_participants,
          removed: removed.count > 0,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async findById(id: number) {
    return this.prisma.event.findUnique({
      where: { event_id: id },
    });
  }

  async create(data: PersistEventDto) {
    return this.prisma.event.create({
      data: this.toPrismaData(data),
    });
  }

  async update(id: number, data: PersistEventDto) {
    return this.prisma.event.update({
      where: { event_id: id },
      data: this.toPrismaData(data),
    });
  }

  async updateDonations(
    id: number,
    donations: {
      funds_donation: boolean;
      goods_donation: boolean;
      goods_types: string[];
    },
  ) {
    return this.prisma.event.update({
      where: { event_id: id },
      data: donations,
    });
  }

  /** Cancelled rows untouched; returns counts for the log. */
  async advanceStatuses(now: Date) {
    const [completed, ongoing] = await this.prisma.$transaction([
      this.prisma.event.updateMany({
        where: {
          status: { in: [EventStatus.Upcoming, EventStatus.Ongoing] },
          event_ended: { lte: now },
        },
        data: { status: EventStatus.Completed },
      }),
      this.prisma.event.updateMany({
        where: {
          status: EventStatus.Upcoming,
          event_started: { lte: now },
          event_ended: { gt: now },
        },
        data: { status: EventStatus.Ongoing },
      }),
    ]);
    return { ongoing: ongoing.count, completed: completed.count };
  }

  async updateStatus(id: number, status: EventStatus) {
    return this.prisma.event.update({
      where: { event_id: id },
      data: { status },
    });
  }

  async delete(id: number) {
    return this.prisma.event.delete({
      where: { event_id: id },
    });
  }

  private toPrismaData(data: PersistEventDto): Prisma.EventCreateInput {
    return {
      title: data.title,
      description: data.description,
      event_started: data.event_started,
      event_ended: data.event_ended,
      location: data.location,
      max_participants: data.max_participants,
      organizer_name: data.organizer_name,
      category: data.category,
      department: data.department,
      specified_category: data.specified_category,
      images: data.images,
      status: data.status,
      funds_donation: data.funds_donation,
      goods_donation: data.goods_donation,
      goods_types: data.goods_types,
      beneficiary_applicable: data.beneficiary_applicable,
      max_beneficiaries: data.max_beneficiaries,
      geojson: data.geojson ?? Prisma.DbNull,
      area_sqm: data.area_sqm,
      marker_lat: data.marker_lat,
      marker_lng: data.marker_lng,
    };
  }
}
