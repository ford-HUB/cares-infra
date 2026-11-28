import { Injectable } from '@nestjs/common';

export interface GpsPingInput {
  capturedAt: string;
  latitude: number;
  longitude: number;
  accuracyM?: number | null;
  inArea?: boolean | null;
}

export interface GpsParticipantInput {
  userId: string;
  pings: GpsPingInput[];
}

export interface GpsEventInput {
  id: number;
  startedAt: string;
  endedAt: string;
  /** `Event.geojson` as stored — Polygon, MultiPolygon, Feature or FeatureCollection. */
  geojson: unknown;
}

export type GpsAttendanceStatus = 'COMPLETED' | 'ABSENT';
export type GpsAnomalySeverity = 'info' | 'warning' | 'critical';

export interface GpsAnomaly {
  code: string;
  severity: GpsAnomalySeverity;
  message: string;
  at: string | null;
  details: Record<string, unknown> | null;
}

export interface GpsZoneVisit {
  enteredAt: string;
  exitedAt: string;
  durationSeconds: number;
}

export interface GpsParticipantResult {
  userId: string;
  status: GpsAttendanceStatus;
  isValid: boolean;
  timeIn: string | null;
  timeOut: string | null;
  insideSeconds: number;
  hoursRendered: number;
  /** Share (0–1) of the event window the readings place inside the zone. */
  coverageRatio: number;
  lateBySeconds: number | null;
  isLate: boolean;
  pingCount: number;
  insidePingCount: number;
  lastPingAt: string | null;
  lastInside: boolean | null;
  lastDistanceToZoneM: number | null;
  visits: GpsZoneVisit[];
  anomalies: GpsAnomaly[];
  reasons: string[];
}

export interface GpsValidateResult {
  eventId: number;
  eventDurationSeconds: number;
  zoneAreaSqm: number;
  thresholds: Record<string, number>;
  results: GpsParticipantResult[];
}

/** Already camelCase. */
interface GpsApiResponse {
  ok: boolean;
  message?: string;
  data?: GpsValidateResult;
  errors?: unknown;
}

@Injectable()
export class GpsValidatorServiceClient {
  private readonly baseUrl =
    process.env.GPS_VALIDATOR_SERVICE_URL ?? 'http://localhost:8005';

  /** `endedAt` = now + `live` for a mid-event snapshot (1 h departure buffer before timing out). */
  async validate(
    event: GpsEventInput,
    participants: GpsParticipantInput[],
    options: { live?: boolean } = {},
  ): Promise<GpsValidateResult> {
    const response = await fetch(`${this.baseUrl}/api/v1/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event,
        participants,
        live: options.live ?? false,
      }),
    });

    const payload = (await response.json()) as GpsApiResponse;
    if (!response.ok || !payload.ok || !payload.data) {
      throw new Error(payload.message ?? 'GPS validator service failed');
    }
    return payload.data;
  }
}
