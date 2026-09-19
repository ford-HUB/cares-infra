import { Injectable } from '@nestjs/common';
import {
  AttendanceStatus,
  EventStatus,
  GeoValidationMethod,
  type Prisma,
} from '../../../infastructures/prisma/common/client';
import { PrismaService } from '../../../infastructures/prisma/prisma-service';

export type NewLocationPing = Omit<
  Prisma.EventLocationPingCreateManyInput,
  'event_location_ping_id' | 'createdAt'
>;

/**
 * The roster join the portal needs: attendance row + its event + enough of the
 * volunteer to fill the table (name, login email, department, year level).
 */
const ROSTER_INCLUDE = {
  event: {
    select: {
      event_id: true,
      title: true,
      event_started: true,
      department: true,
    },
  },
  user: {
    select: {
      user_id: true,
      firstname: true,
      lastname: true,
      phone_number: true,
      accounts: {
        select: { email: true },
        orderBy: { createdAt: 'asc' },
        take: 1,
      },
      user_school_info: {
        select: {
          department: { select: { name: true } },
          year_level: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  },
} as const;

const EVENT_ZONE_SELECT = {
  event_id: true,
  title: true,
  location: true,
  organizer_name: true,
  event_started: true,
  event_ended: true,
  geojson: true,
  area_sqm: true,
} as const;

@Injectable()
export class EventAttendanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Newest event first, then the volunteer's name, so the table reads chronologically. */
  async findRoster(eventId?: number) {
    return this.prisma.eventAttendance.findMany({
      where: eventId ? { event_id: eventId } : undefined,
      include: ROSTER_INCLUDE,
      orderBy: [
        { event: { event_started: 'desc' } },
        { user: { lastname: 'asc' } },
        { user: { firstname: 'asc' } },
      ],
    });
  }

  /** What the validator needs to judge one event: its window and its fence. */
  async findEventForValidation(eventId: number) {
    return this.prisma.event.findUnique({
      where: { event_id: eventId },
      select: EVENT_ZONE_SELECT,
    });
  }

  /**
   * The event the live monitor should be showing: started, not yet over, not
   * cancelled. When two overlap, the one ending first — it is the one whose roster
   * is about to be ruled on.
   */
  async findActiveEvent(now: Date) {
    return this.prisma.event.findFirst({
      where: {
        event_started: { lte: now },
        event_ended: { gt: now },
        status: { not: EventStatus.Cancelled },
      },
      select: EVENT_ZONE_SELECT,
      orderBy: { event_ended: 'asc' },
    });
  }

  /** Events already over that still have volunteers nobody has ruled on. */
  async findEndedEventIdsWithPending(now: Date, limit = 50): Promise<number[]> {
    const rows = await this.prisma.eventAttendance.findMany({
      where: {
        status: AttendanceStatus.PENDING,
        event: { event_ended: { lt: now } },
      },
      select: { event_id: true },
      distinct: ['event_id'],
      orderBy: { event_id: 'asc' },
      take: limit,
    });
    return rows.map((row) => row.event_id);
  }

  /** PENDING rows the validator may rule on — a MANUAL ruling is never overridden. */
  async findPendingAttendance(eventId: number, userIds?: string[]) {
    return this.prisma.eventAttendance.findMany({
      where: {
        event_id: eventId,
        status: AttendanceStatus.PENDING,
        OR: [
          { validation_method: null },
          { validation_method: { not: GeoValidationMethod.MANUAL } },
        ],
        ...(userIds ? { user_id: { in: userIds } } : {}),
      },
      select: { event_attendance_id: true, user_id: true },
    });
  }

  /**
   * Every reading these volunteers made for the event, oldest first. Rows the device
   * could not name an event for (`event_id` null) are pulled in by time instead, so
   * an offline batch tagged `unassigned` still counts.
   */
  async findPingsForValidation(
    eventId: number,
    userIds: string[],
    window: { from: Date; to: Date },
  ) {
    if (userIds.length === 0) return [];
    return this.prisma.eventLocationPing.findMany({
      where: {
        user_id: { in: userIds },
        OR: [
          { event_id: eventId },
          {
            event_id: null,
            captured_at: { gte: window.from, lte: window.to },
          },
        ],
      },
      select: {
        user_id: true,
        captured_at: true,
        latitude: true,
        longitude: true,
        accuracy_m: true,
        in_area: true,
      },
      orderBy: { captured_at: 'asc' },
    });
  }

  /** Writes the validator's ruling on one row. Only a still-PENDING row is touched. */
  async applyValidation(
    eventAttendanceId: string,
    ruling: {
      status: AttendanceStatus;
      hours_rendered: number;
      first_ping_at: Date | null;
      last_ping_at: Date | null;
      remarks: string | null;
    },
  ): Promise<boolean> {
    const { count } = await this.prisma.eventAttendance.updateMany({
      where: {
        event_attendance_id: eventAttendanceId,
        status: AttendanceStatus.PENDING,
      },
      data: ruling,
    });
    return count > 0;
  }

  /**
   * The event is over and these volunteers have pushed nothing: they stay PENDING,
   * but the row now says why — the portal shows it as "awaiting sync".
   */
  async markAwaitingSync(eventAttendanceIds: string[]): Promise<number> {
    if (eventAttendanceIds.length === 0) return 0;
    const { count } = await this.prisma.eventAttendance.updateMany({
      where: {
        event_attendance_id: { in: eventAttendanceIds },
        status: AttendanceStatus.PENDING,
        validation_method: null,
      },
      data: { validation_method: GeoValidationMethod.AWAITING_SYNC },
    });
    return count;
  }

  async eventExists(eventId: number): Promise<boolean> {
    const count = await this.prisma.event.count({
      where: { event_id: eventId },
    });
    return count > 0;
  }

  /**
   * Stores the readings and, when any landed inside the geofence, widens the
   * volunteer's first/last ping window on their attendance row. The row's
   * `validation_method` records where the coordinates came from until the validation
   * service rules; MANUAL is left alone. No attendance row (not registered) is not an
   * error — the readings are still kept for the validation service to assign.
   */
  async recordPings(pings: NewLocationPing[]): Promise<number> {
    if (pings.length === 0) return 0;

    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.eventLocationPing.createMany({ data: pings });

      const inArea = pings.filter((p) => p.in_area && p.event_id != null);
      if (inArea.length === 0) return count;

      const eventId = inArea[0].event_id as number;
      const userId = inArea[0].user_id;
      const source = inArea[0].source;
      const times = inArea.map((p) => new Date(p.captured_at).getTime());
      const first = new Date(Math.min(...times));
      const last = new Date(Math.max(...times));

      await tx.eventAttendance.updateMany({
        where: {
          event_id: eventId,
          user_id: userId,
          OR: [{ first_ping_at: null }, { first_ping_at: { gt: first } }],
        },
        data: { first_ping_at: first },
      });
      await tx.eventAttendance.updateMany({
        where: {
          event_id: eventId,
          user_id: userId,
          OR: [{ last_ping_at: null }, { last_ping_at: { lt: last } }],
        },
        data: { last_ping_at: last },
      });
      await tx.eventAttendance.updateMany({
        where: {
          event_id: eventId,
          user_id: userId,
          OR: [
            { validation_method: null },
            { validation_method: GeoValidationMethod.AWAITING_SYNC },
          ],
        },
        data: { validation_method: source },
      });

      return count;
    });
  }
}

export type RosterRow = Awaited<
  ReturnType<EventAttendanceRepository['findRoster']>
>[number];

export type EventZoneRow = NonNullable<
  Awaited<ReturnType<EventAttendanceRepository['findEventForValidation']>>
>;

export type ValidationPingRow = Awaited<
  ReturnType<EventAttendanceRepository['findPingsForValidation']>
>[number];
