import { Injectable } from '@nestjs/common';
import {
  EventStatus,
  Prisma,
} from '../../../infastructures/prisma/common/client';
import { PrismaService } from '../../../infastructures/prisma/prisma-service';
import { PersistEventDto } from '../dto/events-site-dto';

/** Thrown inside the register transaction to roll it back when no slot is left. */
class EventFullError extends Error {}

@Injectable()
export class EventsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.event.findMany({
      orderBy: { event_started: 'desc' },
    });
  }

  /**
   * Events a volunteer can still join, soonest first — the pool the recommender
   * ranks. Carries the live attendance count and whether this volunteer already
   * has a row, so the app can show real slots and the joined state.
   */
  async findOpenForVolunteers(userId: string) {
    return this.prisma.event.findMany({
      where: {
        status: { in: [EventStatus.Upcoming, EventStatus.Ongoing] },
        event_ended: { gte: new Date() },
      },
      include: {
        _count: { select: { attendances: true } },
        attendances: {
          where: { user_id: userId },
          select: { event_attendance_id: true, status: true },
        },
      },
      orderBy: { event_started: 'asc' },
    });
  }

  /**
   * Open events flagged as applicable to beneficiaries, soonest first. Same row
   * shape as the volunteer pool so one DTO serves both feeds; beneficiaries do
   * not hold attendance rows, so the per-user slice comes back empty.
   */
  async findOpenForBeneficiaries(userId: string) {
    return this.prisma.event.findMany({
      where: {
        status: { in: [EventStatus.Upcoming, EventStatus.Ongoing] },
        event_ended: { gte: new Date() },
        beneficiary_applicable: true,
      },
      include: {
        _count: { select: { attendances: true } },
        attendances: {
          where: { user_id: userId },
          select: { event_attendance_id: true, status: true },
        },
      },
      orderBy: { event_started: 'asc' },
    });
  }

  /**
   * Open events whose director enabled at least one accepted donation type,
   * soonest first — the donor app's campaign feed. Same row shape as the
   * volunteer pool; donors hold no attendance rows, so that slice is empty.
   */
  async findOpenForDonors(userId: string) {
    return this.prisma.event.findMany({
      where: {
        status: { in: [EventStatus.Upcoming, EventStatus.Ongoing] },
        event_ended: { gte: new Date() },
        OR: [{ funds_donation: true }, { goods_donation: true }],
      },
      include: {
        _count: { select: { attendances: true } },
        attendances: {
          where: { user_id: userId },
          select: { event_attendance_id: true, status: true },
        },
      },
      orderBy: { event_started: 'asc' },
    });
  }

  /**
   * Events flagged for beneficiaries that have run their course — marked
   * completed, or past their end time — latest first. Cancelled ones stay out.
   */
  async findCompletedForBeneficiaries(userId: string) {
    return this.prisma.event.findMany({
      where: {
        beneficiary_applicable: true,
        status: { not: EventStatus.Cancelled },
        OR: [
          { status: EventStatus.Completed },
          { event_ended: { lt: new Date() } },
        ],
      },
      include: {
        _count: { select: { attendances: true } },
        attendances: {
          where: { user_id: userId },
          select: { event_attendance_id: true, status: true },
        },
      },
      orderBy: { event_started: 'desc' },
    });
  }

  /**
   * The beneficiary's live applications (EVENT_JOIN requests) for the given
   * events — pending or accepted; a removed request no longer counts.
   */
  async findBeneficiaryApplications(userId: string, eventIds: number[]) {
    if (eventIds.length === 0) return [];
    return this.prisma.userRequest.findMany({
      where: {
        user_id: userId,
        kind: 'EVENT_JOIN',
        event_id: { in: eventIds },
        status: { in: ['PENDING', 'ACCEPTED'] },
      },
      select: { event_id: true, status: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Every event this volunteer holds an attendance row on, latest first —
   * finished ones included, since the activity page is where they land once
   * they leave the open pool. Cancelled events are left out.
   */
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
          select: { event_attendance_id: true, status: true },
        },
      },
      orderBy: { event_started: 'desc' },
    });
  }

  /**
   * Registers a volunteer: inserts their attendance row and rewrites the event's
   * `participants` from the actual row count. Runs serializable so two volunteers
   * racing for the last slot cannot both get it; the caller retries on a
   * serialization failure. Returns null when the event is full (nothing is
   * written) and the fresh counts otherwise. Already registered is a no-op that
   * still returns the counts.
   */
  async register(eventId: number, userId: string) {
    return this.prisma
      .$transaction(
        async (tx) => {
          const existing = await tx.eventAttendance.findUnique({
            where: { event_id_user_id: { event_id: eventId, user_id: userId } },
            select: { event_attendance_id: true },
          });
          if (!existing) {
            await tx.eventAttendance.create({
              data: { event_id: eventId, user_id: userId },
            });
          }

          const participants = await tx.eventAttendance.count({
            where: { event_id: eventId },
          });
          const event = await tx.event.findUniqueOrThrow({
            where: { event_id: eventId },
            select: { max_participants: true },
          });
          if (!existing && participants > event.max_participants) {
            // Roll the insert back: the transaction is discarded on a throw, so
            // the sentinel is turned into a null return below.
            throw new EventFullError();
          }

          await tx.event.update({
            where: { event_id: eventId },
            data: { participants },
          });
          return { participants, max_participants: event.max_participants };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      )
      .catch((error: unknown) => {
        if (error instanceof EventFullError) return null;
        throw error;
      });
  }

  /** Drops the volunteer's attendance row and recounts `participants`. */
  async unregister(eventId: number, userId: string) {
    return this.prisma.$transaction(
      async (tx) => {
        await tx.eventAttendance.deleteMany({
          where: { event_id: eventId, user_id: userId },
        });
        const participants = await tx.eventAttendance.count({
          where: { event_id: eventId },
        });
        const event = await tx.event.update({
          where: { event_id: eventId },
          data: { participants },
          select: { max_participants: true },
        });
        return { participants, max_participants: event.max_participants };
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

  /**
   * Rolls every event's status forward on the clock: started ones become
   * Ongoing, finished ones Completed. Cancelled rows are never touched. Returns
   * how many rows moved in each direction so the sweep can log it.
   */
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
