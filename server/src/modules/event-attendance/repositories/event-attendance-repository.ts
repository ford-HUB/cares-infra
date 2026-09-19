import { Injectable } from '@nestjs/common';
import {
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
