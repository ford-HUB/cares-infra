import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infastructures/prisma/prisma-service';

/**
 * The roster join the portal needs: attendance row + its event + enough of the
 * volunteer to fill the table (name, login email, department, year level).
 */
const ROSTER_INCLUDE = {
  event: {
    select: { event_id: true, title: true, event_started: true },
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
}

export type RosterRow = Awaited<
  ReturnType<EventAttendanceRepository['findRoster']>
>[number];
