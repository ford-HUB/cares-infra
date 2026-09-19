import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { GeoValidationMethod } from '../../../infastructures/prisma/common/client';
import type {
  LiveCoordinateDto,
  LiveCoordinateResponseDto,
  SyncCoordinatesFieldsDto,
  SyncCoordinatesResponseDto,
} from '../dto/event-attendance-mobile-dto';
import {
  EventAttendanceRepository,
  type NewLocationPing,
} from '../repositories/event-attendance-repository';
import { SYNC_CSV_HEADER } from '../validators/event-attendance-mobile-validator';
import { EventAttendanceValidationService } from './event-attendance-validation-service';

@Injectable()
export class EventAttendanceMobileService {
  private readonly logger = new Logger(EventAttendanceMobileService.name);

  constructor(
    private readonly eventAttendanceRepository: EventAttendanceRepository,
    private readonly eventAttendanceValidationService: EventAttendanceValidationService,
  ) {}

  /** One reading straight from a connected device. */
  async recordLive(
    userId: string,
    reading: LiveCoordinateDto,
  ): Promise<LiveCoordinateResponseDto> {
    const eventId = await this.resolveEventId(reading.eventId);
    const accepted = await this.eventAttendanceRepository.recordPings([
      {
        event_id: eventId,
        user_id: userId,
        captured_at: new Date(reading.capturedAt),
        latitude: reading.latitude,
        longitude: reading.longitude,
        accuracy_m: reading.accuracyMeters,
        in_area: reading.inArea,
        source: GeoValidationMethod.GEOFENCE,
      },
    ]);
    this.validateInBackground(eventId, userId);
    return { accepted };
  }

  /**
   * A batch the device buffered while offline, as the CSV it generates from its
   * pending rows. Unreadable lines are counted and dropped rather than failing the
   * whole upload — the device would otherwise retry the same file forever.
   */
  async recordSync(
    userId: string,
    fields: SyncCoordinatesFieldsDto,
    file: Express.Multer.File | undefined,
  ): Promise<SyncCoordinatesResponseDto> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('A CSV file is required');
    }

    const eventId = await this.resolveEventId(fields.eventId);
    const { pings, skipped } = this.parseCsv(file.buffer.toString('utf8'), {
      eventId,
      userId,
    });
    if (pings.length === 0) {
      throw new BadRequestException('The CSV has no readable coordinate rows');
    }

    const accepted = await this.eventAttendanceRepository.recordPings(pings);
    this.validateInBackground(eventId, userId);
    return { accepted, skipped };
  }

  /**
   * The device is waiting on a 200 and must not be held up by the validator, so
   * the ruling runs after the response. It is a no-op while the event is still on;
   * once the event is over, a late offline batch is judged the moment it lands.
   */
  private validateInBackground(eventId: number | null, userId: string): void {
    if (eventId == null) return;
    void this.eventAttendanceValidationService
      .validateIfEnded(eventId, userId)
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `validation after upload failed for event ${eventId} user ${userId}: ${message}`,
        );
      });
  }

  /** A numeric id that names a real event; otherwise a null hint. */
  private async resolveEventId(raw: string): Promise<number | null> {
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed <= 0) return null;
    return (await this.eventAttendanceRepository.eventExists(parsed))
      ? parsed
      : null;
  }

  private parseCsv(
    text: string,
    ctx: { eventId: number | null; userId: string },
  ): { pings: NewLocationPing[]; skipped: number } {
    const pings: NewLocationPing[] = [];
    let skipped = 0;

    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line === SYNC_CSV_HEADER) continue;

      const [time, lat, lng, accuracy, inArea] = line.split(',');
      const capturedAt = new Date(time);
      const latitude = Number(lat);
      const longitude = Number(lng);
      const accuracyMeters = Number(accuracy);
      const valid =
        !Number.isNaN(capturedAt.getTime()) &&
        Number.isFinite(latitude) &&
        Math.abs(latitude) <= 90 &&
        Number.isFinite(longitude) &&
        Math.abs(longitude) <= 180 &&
        Number.isFinite(accuracyMeters) &&
        accuracyMeters >= 0 &&
        (inArea === '0' || inArea === '1');
      if (!valid) {
        skipped++;
        continue;
      }

      pings.push({
        event_id: ctx.eventId,
        user_id: ctx.userId,
        captured_at: capturedAt,
        latitude,
        longitude,
        accuracy_m: accuracyMeters,
        in_area: inArea === '1',
        source: GeoValidationMethod.OFFLINE_SYNC,
      });
    }

    return { pings, skipped };
  }
}
