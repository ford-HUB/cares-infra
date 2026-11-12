import { asCase } from '../../../../config/test-case';
import { BadRequestException } from '@nestjs/common';
import {
  expectSafeErrorEnvelope,
  runApiLayer,
  LayerFixture,
  autoMock,
  expectValidationEnvelope,
  runSchemaLayer,
  withPollution,
} from '../../../../config/layer-harness';
import {
  EVENTS_PATH,
  VALID_EVENT,
  useEventsApp,
  STORED_IMAGE_URL,
  VALID_EVENT as VALID,
  VALID_FORM,
  describeEventTable,
  postForm,
  CALLER,
  JPEG_BYTES,
  PNG_BYTES,
} from '../events-site-support';
import { EventsSiteService } from '../../../../../src/modules/events/services/events-site-service';
import { CreateEventSchema, EVENT_MAX_IMAGE_BYTES } from '../../../../../src/modules/events/validators/events-site-validator';
import {
  CONTROL_CHAR_PAYLOADS,
  HOSTILE_STRINGS,
  MASS_ASSIGNMENT_KEYS,
  OPERATOR_INJECTION_PAYLOADS,
  PRIVATE_OBJECT_KEY_PAYLOADS,
  PROTOTYPE_POLLUTION_BODIES,
  SQL_INJECTION_PAYLOADS,
  SSRF_URL_PAYLOADS,
  XSS_PAYLOADS,
  specialCharacterSeries,
} from '../../../../config/security-payloads';

/**
 * Manage Event Module · Create Event — invalid inputs.
 *
 * Every case here is an intentionally wrong input. A case Passes when the system
 * refuses it exactly as stated — a rejection as expected is the correct result.
 * The valid cases for this unit live in ../valid/.
 */

/* ── error handling ──────────────────────────────────────────────────────── */
{
  /**
   * Create event — error handling: unexpected service errors and a response the serializer
   * refuses are masked as a generic 500 with nothing leaked, and the service's deliberate
   * HttpExceptions keep their status and message through the envelope.
   */
  const DELIBERATE_ERRORS = [
    { title: '400 for an empty image', error: new BadRequestException('One of the event images is empty') },
    { title: '400 for an image over the limit', error: new BadRequestException('Each event image must be 3 MB or smaller') },
    { title: '400 for a file that is not an allowed image', error: new BadRequestException('Only JPG, PNG, or WebP images are allowed') },
  ];

  describe('events site · create — error handling', () => {
    const ctx = useEventsApp();

    describe(`POST ${EVENTS_PATH}`, () => {
      const create = () => runApiLayer(ctx.app, { method: 'post', path: EVENTS_PATH, body: VALID_EVENT });

      asCase('invalid', 'The service fails with an unexpected internal or database error').it('masks an unexpected service error as a 500 without leaking detail', async () => {
        ctx.service.createEvent.mockRejectedValueOnce(new Error('syntax error at or near "OR"') as never);
        const outcome = await create();
        expect(outcome.status).toBe(500);
        expectSafeErrorEnvelope(outcome);
        expect(outcome.body).toEqual({ ok: false, message: 'Internal server error' });
      });

      asCase('invalid', 'File storage fails while the event is saved').it('masks a storage failure as a 500 without naming the bucket', async () => {
        ctx.service.createEvent.mockRejectedValueOnce(new Error('AccessDenied: s3://cares-private-bucket/events') as never);
        const outcome = await create();
        expect(outcome.status).toBe(500);
        expect(outcome.body).toEqual({ ok: false, message: 'Internal server error' });
      });

      asCase('invalid', 'The service returns data that breaks the response schema').it('masks a response the serializer refuses as a 500', async () => {
        ctx.service.createEvent.mockResolvedValueOnce({ event_id: 'not-a-number' } as never);
        const outcome = await create();
        expect(outcome.status).toBe(500);
        expect(outcome.body).toEqual({ ok: false, message: 'Internal server error' });
      });

      asCase('invalid', 'The service refuses the request with a deliberate HTTP error (each kind)', 'Each deliberate error keeps its status and message in the { ok: false } envelope').it.each(DELIBERATE_ERRORS)('keeps $title', async ({ error }) => {
        ctx.service.createEvent.mockRejectedValueOnce(error as never);
        const outcome = await create();
        expect(outcome.status).toBe(error.getStatus());
        expectSafeErrorEnvelope(outcome);
        expect(outcome.body.message).toBe(error.message);
      });
    });
  });
}

/* ── input validation ────────────────────────────────────────────────────── */
{
  /**
   * Create event — input validation: required, empty and length rules, the numeric bounds,
   * the rules the portal's own form enforces (the category list, School needs a department,
   * Others needs a name), plus legitimate inputs that must pass.
   */
  const requiredText = (field: string): LayerFixture[] => [
    { name: `${field} missing`, input: { ...VALID, [field]: undefined }, expected: 'FAIL', field },
    { name: `${field} empty`, input: { ...VALID, [field]: '' }, expected: 'FAIL', field },
    { name: `${field} whitespace-only`, input: { ...VALID, [field]: '     ' }, expected: 'FAIL', field },
  ];

  const lengthBounds = (field: string, min: number, max: number): LayerFixture[] => [
    { name: `${field} under min`, input: { ...VALID, [field]: 'a'.repeat(min - 1) }, expected: 'FAIL', field },
    { name: `${field} over max`, input: { ...VALID, [field]: 'a'.repeat(max + 1) }, expected: 'FAIL', field },
  ];

  const fixtures: LayerFixture[] = [

    ...requiredText('title'),
    ...lengthBounds('title', 3, 255),

    ...requiredText('description'),
    ...lengthBounds('description', 10, 2000),

    ...requiredText('location'),
    ...lengthBounds('location', 3, 255),

    ...requiredText('organizer_name'),
    ...lengthBounds('organizer_name', 2, 255),

    ...requiredText('category'),
    { name: 'category not on the list', input: { ...VALID, category: 'Festival' }, expected: 'FAIL', field: 'category' },
    { name: 'category in the wrong case', input: { ...VALID, category: 'community' }, expected: 'FAIL', field: 'category' },
    { name: 'School without a department', input: { ...VALID, category: 'School' }, expected: 'FAIL', field: 'department' },
    { name: 'School with a blank department', input: { ...VALID, category: 'School', department: '   ' }, expected: 'FAIL', field: 'department' },
    { name: 'Others without a name', input: { ...VALID, category: 'Others' }, expected: 'FAIL', field: 'specified_category' },
    { name: 'Others with a one-letter name', input: { ...VALID, category: 'Others', specified_category: 'a' }, expected: 'FAIL', field: 'specified_category' },
    { name: 'department over max', input: { ...VALID, department: 'a'.repeat(201) }, expected: 'FAIL', field: 'department' },
    { name: 'specified_category over max', input: { ...VALID, specified_category: 'a'.repeat(201) }, expected: 'FAIL', field: 'specified_category' },

    { name: 'event_started missing', input: { ...VALID, event_started: undefined }, expected: 'FAIL', field: 'event_started' },
    { name: 'event_started empty', input: { ...VALID, event_started: '' }, expected: 'FAIL', field: 'event_started' },
    { name: 'event_started not a date', input: { ...VALID, event_started: 'next tuesday' }, expected: 'FAIL' },
    { name: 'event_started a bare number', input: { ...VALID, event_started: '1' }, expected: 'FAIL' },
    { name: 'event_started with month 13', input: { ...VALID, event_started: '2026-13-01T01:00:00.000Z' }, expected: 'FAIL' },
    { name: 'event_ended missing', input: { ...VALID, event_ended: undefined }, expected: 'FAIL', field: 'event_ended' },
    { name: 'event_ended empty', input: { ...VALID, event_ended: '' }, expected: 'FAIL', field: 'event_ended' },
    { name: 'event_ended not a date', input: { ...VALID, event_ended: 'next tuesday' }, expected: 'FAIL', field: 'event_ended' },
    { name: 'end before start', input: { ...VALID, event_ended: '2026-12-01T00:59:00.000Z' }, expected: 'FAIL', field: 'event_ended', message: 'End must be after start' },
    { name: 'end equal to start', input: { ...VALID, event_ended: VALID.event_started }, expected: 'FAIL', field: 'event_ended', message: 'End must be after start' },

    { name: 'max_participants missing', input: { ...VALID, max_participants: undefined }, expected: 'FAIL', field: 'max_participants' },
    { name: 'max_participants zero', input: { ...VALID, max_participants: 0 }, expected: 'FAIL', field: 'max_participants' },
    { name: 'max_participants negative', input: { ...VALID, max_participants: -1 }, expected: 'FAIL', field: 'max_participants' },
    { name: 'max_participants over max', input: { ...VALID, max_participants: 10001 }, expected: 'FAIL', field: 'max_participants' },
    { name: 'max_participants with a fraction', input: { ...VALID, max_participants: 1.5 }, expected: 'FAIL', field: 'max_participants' },
    { name: 'max_participants empty form text', input: { ...VALID, max_participants: '' }, expected: 'FAIL', field: 'max_participants' },
    { name: 'max_participants as words', input: { ...VALID, max_participants: 'fifty' }, expected: 'FAIL', field: 'max_participants' },
    { name: 'max_participants as a hex literal', input: { ...VALID, max_participants: '0x10' }, expected: 'FAIL', field: 'max_participants' },
    { name: 'max_beneficiaries zero', input: { ...VALID, max_beneficiaries: 0 }, expected: 'FAIL', field: 'max_beneficiaries' },
    { name: 'max_beneficiaries negative', input: { ...VALID, max_beneficiaries: -1 }, expected: 'FAIL', field: 'max_beneficiaries' },
    { name: 'max_beneficiaries with a fraction', input: { ...VALID, max_beneficiaries: 1.5 }, expected: 'FAIL', field: 'max_beneficiaries' },
    { name: 'max_beneficiaries as words', input: { ...VALID, max_beneficiaries: 'five' }, expected: 'FAIL', field: 'max_beneficiaries' },

    ...['beneficiary_applicable', 'funds_donation', 'goods_donation'].flatMap((field): LayerFixture[] => [
      { name: `${field} as a word that means nothing`, input: { ...VALID, [field]: 'maybe' }, expected: 'FAIL', field },
      { name: `${field} empty`, input: { ...VALID, [field]: '' }, expected: 'FAIL', field },
    ]),
    {
      name: 'beneficiary event taking goods with no goods types',
      input: { ...VALID, beneficiary_applicable: true, goods_donation: true },
      expected: 'FAIL',
      field: 'goods_types',
    },
    { name: 'goods_types with 1000 entries', input: { ...VALID, goods_types: Array(1000).fill('Rice') }, expected: 'FAIL', field: 'goods_types' },
    { name: 'goods_types with a 10000-character entry', input: { ...VALID, goods_types: ['a'.repeat(10000)] }, expected: 'FAIL', field: 'goods_types.0' },
    { name: 'event_images_existing over the image limit', input: { ...VALID, event_images_existing: Array(4).fill(STORED_IMAGE_URL) }, expected: 'FAIL', field: 'event_images_existing' },
    { name: 'geojson text that is not JSON', input: { ...VALID, geojson: '{"type":' }, expected: 'FAIL', field: 'geojson' },
    { name: 'geojson text holding a number', input: { ...VALID, geojson: '123' }, expected: 'FAIL', field: 'geojson' },
    { name: 'geojson text holding a list', input: { ...VALID, geojson: '[]' }, expected: 'FAIL', field: 'geojson' },
    { name: 'geojson with an unknown type', input: { ...VALID, geojson: { type: 'Circle', coordinates: [] } }, expected: 'FAIL', field: 'geojson' },
    { name: 'geojson with no coordinates', input: { ...VALID, geojson: { type: 'Polygon' } }, expected: 'FAIL', field: 'geojson' },
    { name: 'area_sqm negative', input: { ...VALID, area_sqm: -1 }, expected: 'FAIL', field: 'area_sqm' },
    { name: 'area_sqm as words', input: { ...VALID, area_sqm: 'large' }, expected: 'FAIL', field: 'area_sqm' },
    { name: 'area_sqm as Infinity', input: { ...VALID, area_sqm: 'Infinity' }, expected: 'FAIL', field: 'area_sqm' },
    { name: 'marker_lat over 90', input: { ...VALID, marker_lat: 90.1, marker_lng: 123.89 }, expected: 'FAIL', field: 'marker_lat' },
    { name: 'marker_lat under -90', input: { ...VALID, marker_lat: -90.1, marker_lng: 123.89 }, expected: 'FAIL', field: 'marker_lat' },
    { name: 'marker_lng over 180', input: { ...VALID, marker_lat: 10.31, marker_lng: 180.1 }, expected: 'FAIL', field: 'marker_lng' },
    { name: 'marker_lng under -180', input: { ...VALID, marker_lat: 10.31, marker_lng: -180.1 }, expected: 'FAIL', field: 'marker_lng' },
    { name: 'marker_lat without marker_lng', input: { ...VALID, marker_lat: 10.31 }, expected: 'FAIL' },
    { name: 'marker_lng without marker_lat', input: { ...VALID, marker_lng: 123.89 }, expected: 'FAIL' },
  ];

  describe('events site · create — input validation', () => {
    const ctx = useEventsApp();

    describe(`POST ${EVENTS_PATH}`, () => {
      describeEventTable(ctx, fixtures);

      asCase('invalid', 'Staff submits an invalid multipart form').it('stops an invalid multipart form in the validation envelope', async () => {
        const res = await postForm(ctx.app, { ...VALID_FORM, title: 'ab' });
        expect(res.status).toBe(400);
        expect(res.body).toEqual(
          expect.objectContaining({
            ok: false,
            message: 'Validation failed',
            errors: expect.arrayContaining([
              expect.objectContaining({ path: 'title', message: 'Event title must be at least 3 characters' }),
            ]),
          }),
        );
        expect(ctx.service.createEvent).not.toHaveBeenCalled();
      });
    });
  });
}

/* ── security ────────────────────────────────────────────────────────────── */
{
  /**
   * Create event — security, per field class:
   *   category, event_started, event_ended, max_participants, max_beneficiaries, area_sqm,
   *   marker_lat, marker_lng, the three booleans, geojson
   *              constrained: every hostile string FAILs
   *   event_images_existing
   *              constrained to this feature's own stored images, because the image route
   *              fetches whatever is listed from the bucket every feature shares
   *   title, location, organizer_name, department, specified_category, goods_types
   *              short label: SQLi, special-char series, control chars, XSS FAIL
   *   description
   *              free text, trimmed: control characters FAIL, line breaks stay
   * plus type confusion, mass assignment, prototype pollution and the uploaded files.
   */
  const rejectHostile = (field: string, wrap: (value: unknown) => unknown = (value) => value, issuePath: string | null = field): LayerFixture[] =>
    HOSTILE_STRINGS.map((p) => ({
      name: `${field} ← ${p.category}: ${p.label}`,
      input: { ...VALID, [field]: wrap(p.value) },
      expected: 'FAIL',
      ...(issuePath === null ? {} : { field: issuePath }),
    }));

  const rejectLabelAttacks = (field: string, wrap: (value: unknown) => unknown = (value) => value, issuePath = field): LayerFixture[] =>
    [...SQL_INJECTION_PAYLOADS, ...specialCharacterSeries(), ...CONTROL_CHAR_PAYLOADS, ...XSS_PAYLOADS].map((p) => ({
      name: `${field} ← ${p.category}: ${p.label}`,
      input: { ...VALID, [field]: wrap(p.value) },
      expected: 'FAIL',
      field: issuePath,
    }));

  /** `skip` drops the payloads that are a real value for this field, exercised as PASS elsewhere. */
  const typeConfusion = (field: string, { skip = (_value: unknown) => false, list = false } = {}): LayerFixture[] =>
    OPERATOR_INJECTION_PAYLOADS.filter((p) => !skip(p.value)).map((p) => ({
      name: `${field} ← ${p.category}: ${p.label}`,
      input: { ...VALID, [field]: p.value },
      expected: 'FAIL',
      field: list && Array.isArray(p.value) ? `${field}.0` : field,
    }));

  const isNumber = (value: unknown) => typeof value === 'number';
  const isBoolean = (value: unknown) => typeof value === 'boolean';

  const fixtures: LayerFixture[] = [
    ...rejectHostile('category'),
    ...typeConfusion('category'),

    // A start that does not parse is reported on the end, by the rule comparing the two.
    ...rejectHostile('event_started', undefined, null),
    ...typeConfusion('event_started'),
    ...rejectHostile('event_ended'),
    ...typeConfusion('event_ended'),

    ...rejectHostile('max_participants'),
    ...typeConfusion('max_participants', { skip: isNumber }),

    ...['max_beneficiaries', 'area_sqm', 'marker_lat', 'marker_lng'].flatMap((field) => [
      ...rejectHostile(field),
      ...typeConfusion(field, { skip: isNumber }),
    ]),

    ...['beneficiary_applicable', 'funds_donation', 'goods_donation'].flatMap((field) => [
      ...rejectHostile(field),
      ...typeConfusion(field, { skip: isBoolean }),
    ]),

    ...rejectHostile('geojson'),
    ...typeConfusion('geojson', { skip: (value) => value === null }),

    ...rejectHostile('event_images_existing', (value) => [value], 'event_images_existing.0'),
    ...[...SSRF_URL_PAYLOADS, ...PRIVATE_OBJECT_KEY_PAYLOADS].map((p): LayerFixture => ({
      name: `event_images_existing ← ${p.category}: ${p.label}`,
      input: { ...VALID, event_images_existing: [p.value] },
      expected: 'FAIL',
      field: 'event_images_existing.0',
    })),
    { name: 'event_images_existing ← stored image beside a private file', input: { ...VALID, event_images_existing: [STORED_IMAGE_URL, PRIVATE_OBJECT_KEY_PAYLOADS[0].value] }, expected: 'FAIL', field: 'event_images_existing.1' },
    ...typeConfusion('event_images_existing', { list: true }),

    ...['title', 'location', 'organizer_name', 'department', 'specified_category'].flatMap((field) => [
      ...rejectLabelAttacks(field),
      // These two are optional, so `null` must still be refused rather than read as unset.
      ...typeConfusion(field),
    ]),

    ...rejectLabelAttacks('goods_types', (value) => [value], 'goods_types.0'),
    ...typeConfusion('goods_types', { list: true }),
    // The field trims, so it is treated as sanitised: control characters must not get
    // through. The form encodes every line break as CRLF, so that is the exception.
    ...CONTROL_CHAR_PAYLOADS.filter((p) => !(p.label === 'CRLF injection')).map((p): LayerFixture => ({
      name: `description ← ${p.category}: ${p.label}`,
      input: { ...VALID, description: `Event details ${p.value as string}` },
      expected: 'FAIL',
      field: 'description',
    })),
    ...typeConfusion('description'),

    ...MASS_ASSIGNMENT_KEYS.map((extra): LayerFixture => ({
      name: `mass assignment: ${Object.keys(extra).join(', ')}`,
      input: { ...VALID, ...extra },
      expected: 'FAIL',
    })),
    // The server derives the status and counts the participants; none can be supplied.
    { name: 'mass assignment: status', input: { ...VALID, status: 'Completed' }, expected: 'FAIL' },
    { name: 'mass assignment: participants', input: { ...VALID, participants: 9999 }, expected: 'FAIL' },
    { name: 'mass assignment: event_id', input: { ...VALID, event_id: 1 }, expected: 'FAIL' },
    { name: 'mass assignment: images', input: { ...VALID, images: [STORED_IMAGE_URL] }, expected: 'FAIL' },
  ];

  const IMAGE = { name: 'photo.jpg', type: 'image/jpeg', bytes: JPEG_BYTES };

  describe('events site · create — security', () => {
    const ctx = useEventsApp();

    describe(`POST ${EVENTS_PATH}`, () => {
      describeEventTable(ctx, fixtures);

      asCase('invalid', 'Attacker adds a role_type field to the body', 'Rejected and reported as unrecognized_keys').it('mass assignment is reported as unrecognized_keys', async () => {
        const outcome = await runSchemaLayer(CreateEventSchema, { ...VALID, status: 'Completed' });
        expect(outcome.issues).toEqual(
          expect.arrayContaining([expect.objectContaining({ code: 'unrecognized_keys' })]),
        );
      });

      asCase('invalid', 'Attacker sends a __proto__ / constructor.prototype body', 'Request rejected (400); Object.prototype is not polluted').it.each(PROTOTYPE_POLLUTION_BODIES)('FAIL · prototype pollution: $label', async (p) => {
        const outcome = await runApiLayer(ctx.app, {
          method: 'post',
          path: EVENTS_PATH,
          rawBody: withPollution(VALID, p.value as string),
        });
        expect(outcome.verdict).toBe('FAIL');
        expectValidationEnvelope(outcome);
        expect(ctx.service.createEvent).not.toHaveBeenCalled();
        expect(({} as any).isAdmin).toBeUndefined();
      });

      asCase('invalid', 'Client sends malformed (truncated) JSON').it('answers a malformed JSON body in the safe envelope, without reaching the service', async () => {
        const outcome = await runApiLayer(ctx.app, { method: 'post', path: EVENTS_PATH, rawBody: '{"title":' });
        expect(outcome.status).toBe(400);
        expectSafeErrorEnvelope(outcome);
        expect(ctx.service.createEvent).not.toHaveBeenCalled();
      });

      describe('uploaded files', () => {

        asCase('invalid', 'Staff submits a request with more files than the limit').it('refuses more files than the limit before reaching the service', async () => {
          const res = await postForm(ctx.app, VALID_FORM, [IMAGE, IMAGE, IMAGE, IMAGE]);
          expect(res.status).toBe(400);
          expectSafeErrorEnvelope({ layer: 'api', verdict: 'FAIL', issues: [], body: res.body });
          expect(ctx.service.createEvent).not.toHaveBeenCalled();
        });

        asCase('invalid', 'Staff submits a request with a file under another field name').it('refuses a file under another field name before reaching the service', async () => {
          const res = await postForm(ctx.app, VALID_FORM, [{ ...IMAGE, field: 'id_front' }]);
          expect(res.status).toBe(400);
          expectSafeErrorEnvelope({ layer: 'api', verdict: 'FAIL', issues: [], body: res.body });
          expect(ctx.service.createEvent).not.toHaveBeenCalled();
        });

        // Multer buffers uploads in memory, so the limit has to apply while reading the
        // file: a check in the service only runs once all of it has been held.
        asCase('invalid', 'Staff submits a request with a file over the size limit').it('refuses a file over the size limit before reaching the service', async () => {
          const bytes = Buffer.alloc(EVENT_MAX_IMAGE_BYTES + 1);
          const res = await postForm(ctx.app, VALID_FORM, [{ ...IMAGE, bytes }]);
          expect(res.status).toBeGreaterThanOrEqual(400);
          expect(ctx.service.createEvent).not.toHaveBeenCalled();
        });
      });
    });

    // The controller's service is mocked above; the file rules live in the real one.
    describe('createEvent (real service)', () => {
      const data = {
        ...VALID,
        event_images_existing: [] as string[],
        goods_types: [] as string[],
        funds_donation: false,
        goods_donation: false,
        beneficiary_applicable: false,
        geojson: null,
      };
      const upload = (name: string, mimetype: string, buffer: Buffer) =>
        ({ originalname: name, mimetype, buffer, size: buffer.length }) as Express.Multer.File;

      const build = () => {
        const s3 = autoMock<any>({
          uploadToS3: jest.fn(async (key: string) => `https://bucket.s3.amazonaws.com/${key}`),
        });
        const repository = autoMock<any>({
          create: jest.fn(async (dto: object) => ({ event_id: 1, participants: 0, ...dto })),
        });
        const service = new EventsSiteService(repository, s3, autoMock<any>(), autoMock<any>());
        return { service, s3, repository };
      };

      const create = (service: EventsSiteService, files: Express.Multer.File[], extra: object = {}) =>
        service.createEvent(CALLER as never, { ...data, ...extra } as never, files);

      asCase('invalid', 'Staff uploads an empty, oversized, SVG or GIF event image', 'Refused with the stated message; nothing is stored').it.each([
        { title: 'an empty file', file: upload('photo.jpg', 'image/jpeg', Buffer.alloc(0)), message: 'One of the event images is empty' },
        { title: 'a file over the size limit', file: upload('photo.jpg', 'image/jpeg', Buffer.alloc(EVENT_MAX_IMAGE_BYTES + 1)), message: 'Each event image must be 3 MB or smaller' },
        { title: 'an SVG, which can carry script', file: upload('photo.svg', 'image/svg+xml', PNG_BYTES), message: 'Only JPG, PNG, or WebP images are allowed' },
        { title: 'a GIF', file: upload('photo.gif', 'image/gif', PNG_BYTES), message: 'Only JPG, PNG, or WebP images are allowed' },
        { title: 'a PDF declared as one', file: upload('report.pdf', 'application/pdf', Buffer.from('%PDF-1.7')), message: 'Only JPG, PNG, or WebP images are allowed' },
        { title: 'a web page declared as one', file: upload('page.html', 'text/html', Buffer.from('<script>alert(1)</script>')), message: 'Only JPG, PNG, or WebP images are allowed' },
        { title: 'a web page declared as a PNG', file: upload('photo.png', 'image/png', Buffer.from('<script>alert(1)</script>')), message: 'Only JPG, PNG, or WebP images are allowed' },
      ])('refuses $title without storing anything', async ({ file, message }) => {
        const { service, s3, repository } = build();
        await expect(create(service, [file])).rejects.toEqual(new BadRequestException(message));
        expect(s3.uploadToS3).not.toHaveBeenCalled();
        expect(repository.create).not.toHaveBeenCalled();
      });

      asCase('invalid', 'Attacker uploads an image with a path-traversal file name').it('keeps an uploaded file inside the events folder, whatever it is named', async () => {
        const { service, s3 } = build();
        await create(service, [upload('../../user-requests/evil.png', 'image/png', PNG_BYTES)]);
        expect(s3.uploadToS3.mock.calls[0][0]).toMatch(/^events\/\d+-[a-z0-9]+-[a-zA-Z0-9._-]+$/);
      });

      asCase('invalid', 'Staff keeps existing images and uploads more than the limit allows').it('never saves more images than the limit, existing ones first', async () => {
        const { service, repository } = build();
        const existing = [STORED_IMAGE_URL, STORED_IMAGE_URL];
        const file = upload('photo.jpg', 'image/jpeg', JPEG_BYTES);
        await create(service, [file, file], { event_images_existing: existing });
        const saved = repository.create.mock.calls[0][0].images;
        expect(saved).toHaveLength(3);
        expect(saved.slice(0, 2)).toEqual(existing);
      });

      asCase('invalid', 'Staff sends goods types and a beneficiary cap with those options switched off').it('does not save goods types or a beneficiary cap the event has switched off', async () => {
        const { service, repository } = build();
        await create(service, [], { goods_types: ['Rice'], max_beneficiaries: 5 });
        expect(repository.create.mock.calls[0][0]).toMatchObject({ goods_types: [], max_beneficiaries: null });
      });
    });
  });
}
