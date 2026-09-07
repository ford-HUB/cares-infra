import { Injectable } from '@nestjs/common';
import type { EventAttendeeDto } from '../dto/event-attendance-site-dto';
import {
  EventAttendanceRepository,
  type RosterRow,
} from '../repositories/event-attendance-repository';

@Injectable()
export class EventAttendanceSiteService {
  constructor(
    private readonly eventAttendanceRepository: EventAttendanceRepository,
  ) {}

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
