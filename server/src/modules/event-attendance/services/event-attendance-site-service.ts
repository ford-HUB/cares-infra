import { Injectable, Logger } from '@nestjs/common';
import type { GpsParticipantResult } from '../../../infastructures/microservices/gps-validator-service-client';
import type {
  EventAttendeeDto,
  LiveAttendanceSnapshotDto,
  LiveAttendeeDto,
} from '../dto/event-attendance-site-dto';
import {
  EventAttendanceRepository,
  type RosterRow,
} from '../repositories/event-attendance-repository';
import { EventAttendanceValidationService } from './event-attendance-validation-service';

@Injectable()
export class EventAttendanceSiteService {
  private readonly logger = new Logger(EventAttendanceSiteService.name);

  constructor(
    private readonly eventAttendanceRepository: EventAttendanceRepository,
    private readonly eventAttendanceValidationService: EventAttendanceValidationService,
  ) {}

  /**
   * The running event's roster with what the geofence sees right now. Coverage and
   * distance come from the validator run against the event so far; if it is down
   * the page still loads, falling back to the device's own in-area flag with no
   * coverage figure.
   */
  async getLiveSnapshot(): Promise<LiveAttendanceSnapshotDto> {
    const now = new Date();
    const event = await this.eventAttendanceRepository.findActiveEvent(now);
    if (!event) {
      return { session: null, attendees: [], captured_at: now.toISOString() };
    }

    const roster = await this.eventAttendanceRepository.findRoster(
      event.event_id,
    );
    const userIds = roster.map((row) => row.user.user_id);

    let live = new Map<string, GpsParticipantResult>();
    try {
      live = await this.eventAttendanceValidationService.snapshotEvent(
        event,
        userIds,
        now,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`live snapshot fell back to device flags: ${message}`);
    }

    const radius = event.area_sqm
      ? Math.round(Math.sqrt(event.area_sqm / Math.PI))
      : null;

    return {
      session: {
        event_id: event.event_id,
        title: event.title,
        location: event.location,
        started_at: event.event_started.toISOString(),
        ended_at: event.event_ended.toISOString(),
        radius_meters: radius,
        coordinator: event.organizer_name,
      },
      attendees: roster.map((row) =>
        this.mapToLiveDto(row, live.get(row.user.user_id)),
      ),
      captured_at: now.toISOString(),
    };
  }

  private mapToLiveDto(
    row: RosterRow,
    live: GpsParticipantResult | undefined,
  ): LiveAttendeeDto {
    const base = this.mapToDto(row);
    const lastPingAt = live?.lastPingAt ?? base.last_ping_at;
    const inside = live?.lastInside ?? null;

    let state: LiveAttendeeDto['state'] = 'awaiting_sync';
    if (live) state = inside ? 'in_area' : 'outside_area';
    else if (lastPingAt) state = 'in_area';

    return {
      event_attendance_id: base.event_attendance_id,
      user_id: base.user_id,
      firstname: base.firstname,
      lastname: base.lastname,
      email: base.email,
      phone_number: base.phone_number,
      department: base.department,
      year_level: base.year_level,
      state,
      status: base.status,
      validation_method: base.validation_method,
      first_ping_at: live?.timeIn ?? base.first_ping_at,
      last_ping_at: lastPingAt,
      distance_meters: live?.lastDistanceToZoneM ?? null,
      inside_ratio: live ? live.coverageRatio : null,
      remarks: base.remarks,
    };
  }

  /**
   * The whole roster, or one event's. The portal loads it once and does its own
   * search, event and status filtering client-side, so there is no pagination here.
   */
  async listAttendees(eventId?: number): Promise<EventAttendeeDto[]> {
    const rows = await this.eventAttendanceRepository.findRoster(eventId);
    return rows.map((row) => this.mapToDto(row));
  }

  private mapToDto(row: RosterRow): EventAttendeeDto {
    const schoolInfo = row.user.user_school_info[0];

    return {
      event_attendance_id: row.event_attendance_id,
      event_id: row.event.event_id,
      event_title: row.event.title,
      event_started: row.event.event_started.toISOString(),
      event_department: row.event.department,
      user_id: row.user.user_id,
      firstname: row.user.firstname,
      lastname: row.user.lastname,
      email: row.user.accounts[0]?.email ?? '',
      phone_number: row.user.phone_number,
      department: schoolInfo?.department.name ?? null,
      year_level: schoolInfo?.year_level.name ?? null,
      status: row.status,
      validation_method: row.validation_method,
      first_ping_at: row.first_ping_at?.toISOString() ?? null,
      last_ping_at: row.last_ping_at?.toISOString() ?? null,
      hours_rendered: row.hours_rendered,
      remarks: row.remarks,
      registered_at: row.registered_at.toISOString(),
    };
  }
}
