import { Injectable, Logger } from '@nestjs/common';
import {
  GpsValidatorServiceClient,
  type GpsParticipantInput,
  type GpsParticipantResult,
  type GpsPingInput,
} from '../../../infastructures/microservices/gps-validator-service-client';
import {
  AttendanceStatus,
  NotificationCategory,
  NotificationTone,
} from '../../../infastructures/prisma/common/client';
import { NotificationScheduler } from '../../../schedulers/jobs/notification-scheduler';
import { RankingsBoardService } from '../../rankings/services/rankings-board-service';
import {
  EventAttendanceRepository,
  type EventZoneRow,
  type ValidationPingRow,
} from '../repositories/event-attendance-repository';

/** Readings are one per second; the validator credits gaps up to two minutes, so
 *  thinning to one every few seconds loses nothing and keeps the payload small. */
const FINAL_SAMPLE_SECONDS = 2;
const LIVE_SAMPLE_SECONDS = 5;

/** `EventAttendance.remarks` is free text; keep the validator's reasons readable. */
const REMARKS_MAX = 500;

export interface ValidationSummary {
  eventId: number;
  completed: number;
  absent: number;
  awaitingSync: number;
  /** Rows skipped because the event has no fence to judge against. */
  skipped: number;
}

/**
 * The post-event ruling. Gathers each PENDING volunteer's readings, sends them to
 * gps-validator-service and writes back COMPLETED / ABSENT plus the credited hours.
 * Volunteers with nothing recorded are left PENDING as "awaiting sync" — their
 * device may still be offline, and it will upload once it reconnects.
 */
@Injectable()
export class EventAttendanceValidationService {
  private readonly logger = new Logger(EventAttendanceValidationService.name);

  constructor(
    private readonly eventAttendanceRepository: EventAttendanceRepository,
    private readonly gpsValidatorServiceClient: GpsValidatorServiceClient,
    private readonly notificationScheduler: NotificationScheduler,
    private readonly rankingsBoardService: RankingsBoardService,
  ) {}

  /**
   * Called after a device pushes coordinates. Nothing happens while the event is
   * still running — only a finished window can be ruled on.
   */
  async validateIfEnded(eventId: number, userId: string): Promise<void> {
    const event =
      await this.eventAttendanceRepository.findEventForValidation(eventId);
    if (!event || event.event_ended > new Date()) return;
    await this.validateEvent(event, [userId]);
  }

  /** Every event that is over and still has un-ruled volunteers. */
  async sweepEndedEvents(now = new Date()): Promise<ValidationSummary[]> {
    const eventIds =
      await this.eventAttendanceRepository.findEndedEventIdsWithPending(now);
    const summaries: ValidationSummary[] = [];
    for (const eventId of eventIds) {
      const event =
        await this.eventAttendanceRepository.findEventForValidation(eventId);
      if (!event) continue;
      summaries.push(await this.validateEvent(event));
    }
    return summaries;
  }

  async validateEvent(
    event: EventZoneRow,
    userIds?: string[],
  ): Promise<ValidationSummary> {
    const summary: ValidationSummary = {
      eventId: event.event_id,
      completed: 0,
      absent: 0,
      awaitingSync: 0,
      skipped: 0,
    };

    const pending = await this.eventAttendanceRepository.findPendingAttendance(
      event.event_id,
      userIds,
    );
    if (pending.length === 0) return summary;

    if (!event.geojson) {
      this.logger.warn(
        `event ${event.event_id} has no geofence; ${pending.length} attendance row(s) left pending`,
      );
      summary.skipped = pending.length;
      return summary;
    }

    const pings = await this.eventAttendanceRepository.findPingsForValidation(
      event.event_id,
      pending.map((row) => row.user_id),
      { from: event.event_started, to: event.event_ended },
    );
    const byUser = groupPings(pings, FINAL_SAMPLE_SECONDS);

    const silent = pending.filter((row) => !byUser.has(row.user_id));
    summary.awaitingSync =
      await this.eventAttendanceRepository.markAwaitingSync(
        silent.map((row) => row.event_attendance_id),
      );

    const participants: GpsParticipantInput[] = pending
      .filter((row) => byUser.has(row.user_id))
      .map((row) => ({
        userId: row.user_id,
        pings: byUser.get(row.user_id) ?? [],
      }));
    if (participants.length === 0) return summary;

    const verdict = await this.gpsValidatorServiceClient.validate(
      {
        id: event.event_id,
        startedAt: event.event_started.toISOString(),
        endedAt: event.event_ended.toISOString(),
        geojson: event.geojson,
      },
      participants,
    );

    const rowByUser = new Map(pending.map((row) => [row.user_id, row]));
    for (const result of verdict.results) {
      const row = rowByUser.get(result.userId);
      if (!row) continue;
      const applied = await this.eventAttendanceRepository.applyValidation(
        row.event_attendance_id,
        {
          status: result.isValid
            ? AttendanceStatus.COMPLETED
            : AttendanceStatus.ABSENT,
          hours_rendered: result.hoursRendered,
          first_ping_at: result.timeIn ? new Date(result.timeIn) : null,
          last_ping_at: result.timeOut ? new Date(result.timeOut) : null,
          remarks: formatRemarks(result),
        },
      );
      if (!applied) continue;
      if (result.isValid) summary.completed++;
      else summary.absent++;
      await this.notifyRuling(event, row.user_id, result.isValid);
    }

    this.logger.log(
      `event ${event.event_id} validated: ${summary.completed} completed, ${summary.absent} absent, ${summary.awaitingSync} awaiting sync`,
    );
    return summary;
  }

  /**
   * Tells the volunteer how the event was ruled and what it did to their
   * standing. Present: the points earned and a nudge to rate the event. Absent:
   * the penalty just applied and what the next straight miss would cost. Written
   * through the scheduler so a slow queue never holds up the ruling; a failed
   * notice is logged, not thrown, because the ruling itself already stuck.
   */
  private async notifyRuling(
    event: EventZoneRow,
    userId: string,
    present: boolean,
  ): Promise<void> {
    try {
      const [score, settings] = await Promise.all([
        this.rankingsBoardService.scoreVolunteer(userId),
        this.rankingsBoardService.getSettings(),
      ]);
      const step = settings.absence_penalty_step;
      const applied =
        score.currentStreak > 0 ? step * score.currentStreak : step;
      const next = step * (score.currentStreak + 1);

      await this.notificationScheduler.publish(
        present
          ? {
              title: `You were marked present at ${event.title}`,
              description: `+${settings.points_per_attendance} ranking points — you now have ${score.points}. Tap to rate the event and help the next one be better.`,
              category: NotificationCategory.EVENT,
              tone: NotificationTone.INFO,
              href: `/events/${event.event_id}/feedback`,
              userIds: [userId],
              dedupeKey: `attendance-ruled:${event.event_id}`,
            }
          : {
              title: `Marked absent at ${event.title}`,
              description: `You registered but no attendance was recorded inside the venue. −${applied} ranking points${
                score.currentStreak > 1
                  ? ` (${score.currentStreak} straight misses)`
                  : ''
              }; the next skipped registration within ${settings.absence_reset_days} days costs −${next}.`,
              category: NotificationCategory.EVENT,
              tone: NotificationTone.ATTENTION,
              href: `/events/${event.event_id}`,
              userIds: [userId],
              dedupeKey: `attendance-ruled:${event.event_id}`,
            },
      );
    } catch (error) {
      this.logger.warn(
        `could not notify ${userId} about event ${event.event_id}: ${String(error)}`,
      );
    }
  }

  /**
   * A mid-event snapshot for the live monitor: the same analysis with the window
   * cut at `now`, so coverage reads as "of the event so far". Volunteers with no
   * readings are simply absent from the result — the caller treats them as
   * awaiting sync.
   */
  async snapshotEvent(
    event: EventZoneRow,
    userIds: string[],
    now: Date,
  ): Promise<Map<string, GpsParticipantResult>> {
    const results = new Map<string, GpsParticipantResult>();
    if (!event.geojson || userIds.length === 0) return results;

    const pings = await this.eventAttendanceRepository.findPingsForValidation(
      event.event_id,
      userIds,
      { from: event.event_started, to: now },
    );
    const byUser = groupPings(pings, LIVE_SAMPLE_SECONDS);
    if (byUser.size === 0) return results;

    const verdict = await this.gpsValidatorServiceClient.validate(
      {
        id: event.event_id,
        startedAt: event.event_started.toISOString(),
        endedAt: now.toISOString(),
        geojson: event.geojson,
      },
      [...byUser.entries()].map(([userId, userPings]) => ({
        userId,
        pings: userPings,
      })),
    );
    for (const result of verdict.results) results.set(result.userId, result);
    return results;
  }
}

/** Buckets readings per volunteer, thinned to one every `sampleSeconds`. */
function groupPings(
  pings: ValidationPingRow[],
  sampleSeconds: number,
): Map<string, GpsPingInput[]> {
  const byUser = new Map<string, GpsPingInput[]>();
  const lastKept = new Map<string, number>();
  const step = sampleSeconds * 1000;

  for (const ping of pings) {
    const at = ping.captured_at.getTime();
    const previous = lastKept.get(ping.user_id);
    if (previous !== undefined && at - previous < step) continue;
    lastKept.set(ping.user_id, at);

    const list = byUser.get(ping.user_id) ?? [];
    list.push({
      capturedAt: ping.captured_at.toISOString(),
      latitude: ping.latitude,
      longitude: ping.longitude,
      accuracyM: ping.accuracy_m,
      inArea: ping.in_area,
    });
    byUser.set(ping.user_id, list);
  }
  return byUser;
}

function formatRemarks(result: GpsParticipantResult): string | null {
  const lines = [
    ...result.reasons,
    ...result.anomalies
      .filter((anomaly) => anomaly.severity !== 'info')
      .map((anomaly) => anomaly.message),
  ];
  if (lines.length === 0) {
    return `Inside the zone for ${Math.round(result.coverageRatio * 100)}% of the event`;
  }
  const text = [...new Set(lines)].join('; ');
  return text.length > REMARKS_MAX
    ? `${text.slice(0, REMARKS_MAX - 1)}…`
    : text;
}
