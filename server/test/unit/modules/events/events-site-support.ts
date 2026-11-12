import { ExecutionContext, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import request from 'supertest';
import { EventStatus } from '../../../../src/infastructures/prisma/common/client';
import { EventsSiteController } from '../../../../src/modules/events/controllers/events-site-controller';
import { EventsSiteService } from '../../../../src/modules/events/services/events-site-service';
import { CreateEventSchema } from '../../../../src/modules/events/validators/events-site-validator';
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

setCaseUnit({ module: 'Manage Event Module', unit: 'Create Event', prefix: 'EVENT' });

/**
 * Shared by every spec in this folder — Create event on the portal's Manage Event module:
 *   POST /api/v1/events  (createEvent: CreateEventSchema + up to three `event_images`)
 *
 * The portal posts multipart form data, so every value arrives as a string. Fixtures go
 * through `runApiLayer` as JSON, which the same pipe parses, and the form path itself has
 * its own tests through `postForm`. `@Roles` and `@RequirePermission` are not exercised:
 * the global guards are out of scope for these layers.
 *
 * Not a spec itself (no `-unit-spec.ts` suffix); attack strings still come only
 * from `config/security-payloads.ts`.
 */
export const EVENTS_PATH = '/api/v1/events';
export const CALLER = { sub: 'caller-user-id' };

export const VALID_EVENT = {
  title: 'Coastal Clean-up Drive',
  description: 'Volunteers clear the shoreline together.',
  event_started: '2026-12-01T01:00:00.000Z',
  event_ended: '2026-12-01T05:00:00.000Z',
  location: 'Brgy. Lahug, Cebu City',
  max_participants: 50,
  organizer_name: 'CARES Outreach Office',
  category: 'Community',
};

export const STORED_IMAGE_URL = 'https://bucket.s3.amazonaws.com/events/1730000000000-abc123-photo.jpg';

/** What the Polygon the portal draws looks like on the wire. */
export const VALID_GEOJSON = {
  type: 'Polygon',
  coordinates: [[[123.89, 10.31], [123.9, 10.31], [123.9, 10.32], [123.89, 10.31]]],
};

export const EVERY_FIELD = {
  ...VALID_EVENT,
  category: 'School',
  department: 'College of Nursing',
  beneficiary_applicable: true,
  max_beneficiaries: 20,
  funds_donation: true,
  goods_donation: true,
  goods_types: ['Canned goods', 'Bottled water'],
  event_images_existing: [STORED_IMAGE_URL],
  geojson: VALID_GEOJSON,
  area_sqm: 1250.5,
  marker_lat: 10.31,
  marker_lng: 123.89,
};

export const EVENT_RESPONSE = {
  event_id: 1,
  title: VALID_EVENT.title,
  description: VALID_EVENT.description,
  event_started: VALID_EVENT.event_started,
  event_ended: VALID_EVENT.event_ended,
  location: VALID_EVENT.location,
  max_participants: VALID_EVENT.max_participants,
  participants: 0,
  organizer_name: VALID_EVENT.organizer_name,
  category: VALID_EVENT.category,
  event_images: [],
  status: EventStatus.Upcoming,
  funds_donation: false,
  goods_donation: false,
  goods_types: [],
  beneficiary_applicable: false,
  geojson: null,
  area_sqm: null,
  marker_lat: null,
  marker_lng: null,
};

/**
 * Real leading bytes, so a check on the file's actual content would still accept these.
 * The rest is padding: nothing here decodes the image.
 */
export const JPEG_BYTES = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32)]);
export const PNG_BYTES = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(32),
]);

/**
 * Boots `EventsSiteController` with a mocked service for the enclosing `describe`. The
 * handler reads the caller, so a stand-in for the global JWT guard puts `CALLER` on the
 * request. Read `app` inside tests — it is assigned in `beforeAll`.
 */
export const useEventsApp = () => {
  const ctx = {
    app: undefined as unknown as INestApplication,
    service: autoMock<EventsSiteService>(),
  };

  beforeAll(async () => {
    ctx.app = await createApiLayerApp({
      controllers: [EventsSiteController],
      providers: [
        { provide: EventsSiteService, useValue: ctx.service },
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
    ctx.service.createEvent.mockReset().mockResolvedValue(EVENT_RESPONSE as never);
  });

  return ctx;
};

export interface FormFile {
  field?: string;
  name: string;
  type: string;
  bytes: Buffer;
}

/** The request the portal really sends: multipart, with every value as a string. */
export const postForm = (
  app: INestApplication,
  fields: Record<string, string | string[]>,
  files: FormFile[] = [],
) => {
  let req = request(app.getHttpServer()).post(EVENTS_PATH);
  for (const [name, value] of Object.entries(fields)) {
    for (const entry of Array.isArray(value) ? value : [value]) req = req.field(name, entry);
  }
  for (const file of files) {
    req = req.attach(file.field ?? 'event_images', file.bytes, { filename: file.name, contentType: file.type });
  }
  return req;
};

/** `VALID_EVENT` as the portal's form encodes it. */
export const VALID_FORM: Record<string, string> = Object.fromEntries(
  Object.entries(VALID_EVENT).map(([name, value]) => [name, String(value)]),
);

/**
 * Body fixtures through both layers. A FAIL must come back in the validation envelope
 * without reaching the service; a PASS must reach it exactly once.
 */
export const describeEventTable = (ctx: ReturnType<typeof useEventsApp>, fixtures: LayerFixture[]) => {
  fixtureCases(fixtures, (fixture) => {
    it('layer 1 — schema', async () => {
      expectLayer(await runSchemaLayer(CreateEventSchema, fixture.input), fixture);
    });

    it('layer 2 — api', async () => {
      const outcome = await runApiLayer(ctx.app, { method: 'post', path: EVENTS_PATH, body: fixture.input });
      expectLayer(outcome, fixture);

      if (fixture.expected === 'FAIL') {
        expectValidationEnvelope(outcome);
        expect(ctx.service.createEvent).not.toHaveBeenCalled();
      } else {
        expect(ctx.service.createEvent).toHaveBeenCalledTimes(1);
      }
    });
  });
};
