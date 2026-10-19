import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { GpsParticipantResult } from '../../../infastructures/microservices/gps-validator-service-client';
import {
  AttendanceStatus,
  RoleType,
} from '../../../infastructures/prisma/common/client';
import { resolveDepartmentScope } from '../../../shared/constants/departments';
import type { RequestContextDto } from '../../../shared/decorators/request-context-decorator';
import type { JwtPayload } from '../../../shared/types/jwt-payload';
import { AuditLogRecorder } from '../../audit-logs/services/audit-log-recorder';
import type {
  EventAttendeeDto,
  LiveAttendanceSnapshotDto,
  LiveAttendeeDto,
  ManualAttendanceDto,
  ManualAttendanceResultDto,
} from '../dto/event-attendance-site-dto';
import {
  EventAttendanceRepository,
  type ManualMarkRow,
  type RosterRow,
} from '../repositories/event-attendance-repository';
import { EventAttendanceValidationService } from './event-attendance-validation-service';

const MS_PER_HOUR = 3_600_000;

@Injectable()
export class EventAttendanceSiteService {
  private readonly logger = new Logger(EventAttendanceSiteService.name);

  constructor(
    private readonly eventAttendanceRepository: EventAttendanceRepository,
    private readonly eventAttendanceValidationService: EventAttendanceValidationService,
    private readonly auditLogRecorder: AuditLogRecorder,
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

  /**
   * The backup for a failed geofence. Each selected row becomes COMPLETED / MANUAL
   * and is credited the event's full scheduled window as service hours — with no
   * trustworthy readings there is nothing narrower to credit. A coordinator may
   * only rule on their own college's events, and only once an event is over.
   * Rows already COMPLETED are left alone so their hours are not credited twice.
   */
  async markPresentManually(
    caller: JwtPayload,
    body: ManualAttendanceDto,
    context: RequestContextDto = {},
  ): Promise<ManualAttendanceResultDto> {
    const rows = await this.eventAttendanceRepository.findForManualMark(
      body.event_attendance_ids,
    );
    if (rows.length !== body.event_attendance_ids.length) {
      throw new NotFoundException(
        'Some of the selected participants could not be found',
      );
    }

    await this.assertCallerScope(caller, rows);

    const now = new Date();
    const notEnded = rows.find((row) => row.event.event_ended > now);
    if (notEnded) {
      throw new BadRequestException(
        `"${notEnded.event.title}" has not ended yet — attendance can be marked manually once it is over`,
      );
    }

    const remarks = body.reason
      ? `Marked present manually: ${body.reason}`
      : 'Marked present manually (geofence attendance unavailable)';

    const markedIds: string[] = [];
    let alreadyCompleted = 0;
    for (const row of rows) {
      if (row.status === AttendanceStatus.COMPLETED) {
        alreadyCompleted++;
        continue;
      }
      const applied = await this.eventAttendanceRepository.applyManualPresence(
        row.event_attendance_id,
        { hours_rendered: scheduledHours(row.event), remarks },
      );
      if (!applied) {
        alreadyCompleted++;
        continue;
      }
      markedIds.push(row.event_attendance_id);
      await this.eventAttendanceValidationService.notifyRuling(
        row.event,
        row,
        true,
        `attendance-manual:${row.event.event_id}`,
      );
    }

    if (markedIds.length > 0) {
      const marked = new Set(markedIds);
      const events = [
        ...new Map(
          rows
            .filter((row) => marked.has(row.event_attendance_id))
            .map((row) => [row.event.event_id, row.event]),
        ).values(),
      ];
      const label =
        events.length === 1 ? events[0].title : `${events.length} events`;

      await this.auditLogRecorder.record({
        action: 'attendance.manually-marked',
        description: `Manually marked ${markedIds.length} participant${
          markedIds.length === 1 ? '' : 's'
        } present at ${events.length === 1 ? `"${label}"` : label}`,
        category: 'EVENT',
        severity: 'NOTICE',
        actor: caller,
        targetType: 'event',
        targetLabel: label,
        targetId: events.length === 1 ? String(events[0].event_id) : null,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        reason: body.reason ?? null,
        metadata: {
          participants: String(markedIds.length),
          event_ids: events.map((event) => event.event_id).join(','),
        },
      });
    }

    const updated =
      markedIds.length > 0
        ? await this.eventAttendanceRepository.findRosterByIds(markedIds)
        : [];

    return {
      marked: updated.map((row) => this.mapToDto(row)),
      already_completed: alreadyCompleted,
    };
  }

  /** A coordinator is held to the college on their profile; other roles are not. */
  private async assertCallerScope(
    caller: JwtPayload,
    rows: ManualMarkRow[],
  ): Promise<void> {
    if (caller.role_type !== RoleType.COORDINATOR) return;

    const user = await this.eventAttendanceRepository.findUserDepartment(
      caller.sub,
    );
    const department = user?.portal_department?.trim();
    if (!department) {
      throw new ForbiddenException(
        'Your profile has no college set, so you cannot mark attendance',
      );
    }

    const aliases = new Set(
      resolveDepartmentScope(department).aliases.map((alias) =>
        alias.toLowerCase(),
      ),
    );
    const outside = rows.find(
      (row) =>
        !row.event.department ||
        !aliases.has(row.event.department.trim().toLowerCase()),
    );
    if (outside) {
      throw new ForbiddenException(
        `"${outside.event.title}" is not one of your college's events`,
      );
    }
  }

  private mapToDto(row: RosterRow): EventAttendeeDto {
    const schoolInfo = row.user.user_school_info[0];

    return {
      event_attendance_id: row.event_attendance_id,
      event_id: row.event.event_id,
      event_title: row.event.title,
      event_started: row.event.event_started.toISOString(),
      event_ended: row.event.event_ended.toISOString(),
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

/** The event's scheduled length in hours, to two decimals — what a manual ruling credits. */
function scheduledHours(event: { event_started: Date; event_ended: Date }) {
  const ms = event.event_ended.getTime() - event.event_started.getTime();
  return Math.max(0, Math.round((ms / MS_PER_HOUR) * 100) / 100);
}
