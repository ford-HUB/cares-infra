import { ExecutionContext, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import {
  AttendanceStatus,
  GeoValidationMethod,
  RoleType,
} from '../../../../src/infastructures/prisma/common/client';
import { EventAttendanceSiteController } from '../../../../src/modules/event-attendance/controllers/event-attendance-site-controller';
import { EventAttendanceSiteService } from '../../../../src/modules/event-attendance/services/event-attendance-site-service';
import { ManualAttendanceSchema } from '../../../../src/modules/event-attendance/validators/event-attendance-site-validator';
import {
  LayerFixture,
  autoMock,
  createApiLayerApp,
  expectLayer,
  expectValidationEnvelope,
  runApiLayer,
  runSchemaLayer,
} from '../../../config/layer-harness';
import { fixtureCases, setCaseUnit } from '../../../config/test-case';

setCaseUnit({ module: 'Event Attendees Module', unit: 'Manual Attendance', prefix: 'ATTEND' });

/**
 * Shared by every spec in this folder — Mark Present on the Event Attendees screen of the
 * portal's Manage Event module:
 *   POST /api/v1/event-attendees/manual-attendance  (markPresent: ManualAttendanceSchema)
 *
 * `@Roles` and `@RequirePermission` are not exercised: the global guards are out of
 * scope for these layers.
 *
 * Not a spec itself (no `-unit-spec.ts` suffix); attack strings still come only
 * from `config/security-payloads.ts`.
 */
export const MANUAL_ATTENDANCE_PATH = '/api/v1/event-attendees/manual-attendance';
export const CALLER = { sub: 'caller-user-id', role_type: RoleType.DIRECTOR };

export const VALID_ATTENDANCE_ID = 'b3f1c2d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d';
export const OTHER_ATTENDANCE_ID = '6a0c1e2f-3b4d-4e5f-9a6b-7c8d9e0f1a2b';

export const VALID_MARK = {
  event_attendance_ids: [VALID_ATTENDANCE_ID],
  reason: 'The geofence was down during the event.',
};

export const ATTENDEE_RESPONSE = {
  event_attendance_id: VALID_ATTENDANCE_ID,
  event_id: 1,
  event_title: 'Coastal Clean-up Drive',
  event_started: '2026-10-30T01:00:00.000Z',
  event_ended: '2026-10-30T05:00:00.000Z',
  event_department: null,
  user_id: 'volunteer-user-id',
  firstname: 'Ada',
  lastname: 'Lovelace',
  email: 'ada@cares.ph',
  phone_number: null,
  department: null,
  year_level: null,
  status: AttendanceStatus.COMPLETED,
  validation_method: GeoValidationMethod.MANUAL,
  first_ping_at: null,
  last_ping_at: null,
  hours_rendered: 4,
  remarks: 'Marked present manually: The geofence was down during the event.',
  registered_at: '2026-10-20T08:00:00.000Z',
};

export const MARK_RESPONSE = { marked: [ATTENDEE_RESPONSE], already_completed: 0 };

/**
 * Boots `EventAttendanceSiteController` with a mocked service for the enclosing
 * `describe`. The handler reads the caller, so a stand-in for the global JWT guard puts
 * `CALLER` on the request. Read `app` inside tests — it is assigned in `beforeAll`.
 */
export const useEventAttendanceApp = () => {
  const ctx = {
    app: undefined as unknown as INestApplication,
    service: autoMock<EventAttendanceSiteService>(),
  };

  beforeAll(async () => {
    ctx.app = await createApiLayerApp({
      controllers: [EventAttendanceSiteController],
      providers: [
        { provide: EventAttendanceSiteService, useValue: ctx.service },
        {
          provide: APP_GUARD,
          useValue: {
            canActivate: (context: ExecutionContext) => {
              context.switchToHttp().getRequest().user = CALLER;
              return true;
            },
          },
        },
      ],
    });
  });
  afterAll(() => ctx.app.close());
  beforeEach(() => {
    ctx.service.markPresentManually.mockReset().mockResolvedValue(MARK_RESPONSE as never);
  });

  return ctx;
};

/**
 * Body fixtures through both layers. A FAIL must come back in the validation envelope
 * without reaching the service; a PASS must reach it exactly once.
 */
export const describeMarkTable = (ctx: ReturnType<typeof useEventAttendanceApp>, fixtures: LayerFixture[]) => {
  fixtureCases(fixtures, (fixture) => {
    it('layer 1 — schema', async () => {
      expectLayer(await runSchemaLayer(ManualAttendanceSchema, fixture.input), fixture);
    });

    it('layer 2 — api', async () => {
      const outcome = await runApiLayer(ctx.app, { method: 'post', path: MANUAL_ATTENDANCE_PATH, body: fixture.input });
      expectLayer(outcome, fixture);

      if (fixture.expected === 'FAIL') {
        expectValidationEnvelope(outcome);
        expect(ctx.service.markPresentManually).not.toHaveBeenCalled();
      } else {
        expect(ctx.service.markPresentManually).toHaveBeenCalledTimes(1);
      }
    });
  });
};
