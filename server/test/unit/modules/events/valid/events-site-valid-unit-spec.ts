import { asCase } from '../../../../config/test-case';
import { LayerFixture, runApiLayer, autoMock } from '../../../../config/layer-harness';
import {
  EVENTS_PATH,
  EVENT_RESPONSE,
  EVERY_FIELD,
  STORED_IMAGE_URL,
  VALID_EVENT as VALID,
  VALID_FORM,
  VALID_GEOJSON,
  describeEventTable,
  postForm,
  useEventsApp,
  CALLER,
  JPEG_BYTES,
  PNG_BYTES,
} from '../events-site-support';
import { EventsSiteService } from '../../../../../src/modules/events/services/events-site-service';
import {
  CONTROL_CHAR_PAYLOADS,
  PATH_TRAVERSAL_PAYLOADS,
  SQL_INJECTION_PAYLOADS,
  UNICODE_CONFUSABLE_PAYLOADS,
  XSS_PAYLOADS,
  specialCharacterSeries,
} from '../../../../config/security-payloads';

/**
 * Manage Event Module · Create Event — valid inputs.
 *
 * Every case here is a legitimate input the system must accept.
 * The invalid cases for this unit live in ../invalid/.
 */

/* ── input validation ────────────────────────────────────────────────────── */
{
  const lengthBounds = (field: string, min: number, max: number): LayerFixture[] => [
    { name: `${field} at min`, input: { ...VALID, [field]: 'a'.repeat(min) }, expected: 'PASS' },
    { name: `${field} at max`, input: { ...VALID, [field]: 'a'.repeat(max) }, expected: 'PASS' },
    { name: `${field} at max once trimmed`, input: { ...VALID, [field]: `  ${'a'.repeat(max)}  ` }, expected: 'PASS' },
  ];

  const fixtures: LayerFixture[] = [
    { name: 'minimal body', input: VALID, expected: 'PASS' },
    { name: 'every optional field', input: EVERY_FIELD, expected: 'PASS' },
    ...lengthBounds('title', 3, 255),
    { name: 'title with an apostrophe', input: { ...VALID, title: "Children's Day" }, expected: 'PASS' },
    { name: 'title with a hyphen', input: { ...VALID, title: 'Clean-up Drive' }, expected: 'PASS' },
    { name: 'title with a colon, numbers and brackets', input: { ...VALID, title: 'Feeding Program: Phase 2 (Lahug)' }, expected: 'PASS' },
    { name: 'title with accents', input: { ...VALID, title: 'Araw ng Señor' }, expected: 'PASS' },
    ...lengthBounds('description', 10, 2000),
    { name: 'description with line breaks', input: { ...VALID, description: 'Line one\nLine two\n\nLine four' }, expected: 'PASS' },
    { name: 'description with CRLF, as the form encodes it', input: { ...VALID, description: 'Line one\r\nLine two' }, expected: 'PASS' },
    { name: 'description with accents and emoji', input: { ...VALID, description: 'Salamat, Señora! 🙏 See you there.' }, expected: 'PASS' },
    ...lengthBounds('location', 3, 255),
    { name: 'location with an address', input: { ...VALID, location: "12 Gorordo Ave., St. Mary's, Cebu City" }, expected: 'PASS' },
    ...lengthBounds('organizer_name', 2, 255),
    { name: 'organizer with an apostrophe', input: { ...VALID, organizer_name: "Ana O'Neil" }, expected: 'PASS' },
    { name: 'organizer with a hyphen', input: { ...VALID, organizer_name: 'Mary-Ann Reyes' }, expected: 'PASS' },
    ...['School', 'Community', 'Emergency', 'Donation Drive', 'Charity', 'Relief Program', 'Health', 'Outreach', 'Training', 'Seminar', 'Others'].map(
      (category): LayerFixture => ({
        name: `category ${category}`,
        input: {
          ...VALID,
          category,
          ...(category === 'School' ? { department: 'College of Nursing' } : {}),
          ...(category === 'Others' ? { specified_category: 'Sportsfest' } : {}),
        },
        expected: 'PASS',
      }),
    ),

    { name: 'department at max', input: { ...VALID, department: 'a'.repeat(200) }, expected: 'PASS' },
    { name: 'specified_category at max', input: { ...VALID, specified_category: 'a'.repeat(200) }, expected: 'PASS' },
    { name: 'end one minute after start', input: { ...VALID, event_ended: '2026-12-01T01:01:00.000Z' }, expected: 'PASS' },
    { name: 'local date-times without an offset', input: { ...VALID, event_started: '2026-12-01T09:00', event_ended: '2026-12-01T13:00' }, expected: 'PASS' },
    { name: 'max_participants at min', input: { ...VALID, max_participants: 1 }, expected: 'PASS' },
    { name: 'max_participants at max', input: { ...VALID, max_participants: 10000 }, expected: 'PASS' },
    { name: 'max_participants as form text', input: { ...VALID, max_participants: '50' }, expected: 'PASS' },

    { name: 'max_beneficiaries as form text', input: { ...VALID, beneficiary_applicable: 'true', max_beneficiaries: '5' }, expected: 'PASS' },
    { name: 'max_beneficiaries left blank', input: { ...VALID, max_beneficiaries: '' }, expected: 'PASS' },

    ...['beneficiary_applicable', 'funds_donation', 'goods_donation'].flatMap((field): LayerFixture[] => [
      { name: `${field} true`, input: { ...VALID, [field]: true }, expected: 'PASS' },
      { name: `${field} false`, input: { ...VALID, [field]: false }, expected: 'PASS' },
      { name: `${field} form text "true"`, input: { ...VALID, [field]: 'true' }, expected: 'PASS' },
      { name: `${field} form text "false"`, input: { ...VALID, [field]: 'false' }, expected: 'PASS' },
    ]),

    { name: 'goods_types as one form value', input: { ...VALID, goods_donation: 'true', goods_types: 'Canned goods' }, expected: 'PASS' },
    { name: 'goods_types as repeated form values', input: { ...VALID, goods_donation: 'true', goods_types: ['Canned goods', 'Rice'] }, expected: 'PASS' },

    { name: 'event_images_existing as one form value', input: { ...VALID, event_images_existing: STORED_IMAGE_URL }, expected: 'PASS' },
    { name: 'event_images_existing at the image limit', input: { ...VALID, event_images_existing: Array(3).fill(STORED_IMAGE_URL) }, expected: 'PASS' },

    { name: 'geojson as form text', input: { ...VALID, geojson: JSON.stringify(VALID_GEOJSON) }, expected: 'PASS' },
    { name: 'geojson as an object', input: { ...VALID, geojson: VALID_GEOJSON }, expected: 'PASS' },
    { name: 'geojson null', input: { ...VALID, geojson: null }, expected: 'PASS' },

    { name: 'area_sqm as form text', input: { ...VALID, area_sqm: '1250.5' }, expected: 'PASS' },

    { name: 'marker at the corner of the map', input: { ...VALID, marker_lat: 90, marker_lng: 180 }, expected: 'PASS' },
    { name: 'marker at the opposite corner', input: { ...VALID, marker_lat: -90, marker_lng: -180 }, expected: 'PASS' },
    { name: 'marker as form text', input: { ...VALID, marker_lat: '10.31', marker_lng: '123.89' }, expected: 'PASS' },
  ];

  describe('events site · create — input validation', () => {
    const ctx = useEventsApp();

    describe(`POST ${EVENTS_PATH}`, () => {
      describeEventTable(ctx, fixtures);

      asCase('valid', 'Staff submits a valid request').it('wraps the created event in the success envelope', async () => {
        const outcome = await runApiLayer(ctx.app, { method: 'post', path: EVENTS_PATH, body: VALID });
        expect(outcome.status).toBe(201);
        expect(outcome.body).toEqual({ ok: true, message: 'Event created', data: EVENT_RESPONSE });
      });

      asCase('valid', 'Staff submits the form as multipart data, as the portal does').it('accepts the multipart form the portal sends', async () => {
        const res = await postForm(ctx.app, VALID_FORM);
        expect(res.status).toBe(201);
        expect(ctx.service.createEvent).toHaveBeenCalledTimes(1);
      });
    });
  });
}

/* ── normalization ───────────────────────────────────────────────────────── */
{
  /**
   * Create event — normalisation: the schema trims the text and turns the form's strings
   * back into numbers, booleans, lists and JSON; the service receives that with the caller
   * and where the request came from; and only the response schema's fields leave the server.
   */
  describe('events site · create — normalisation', () => {
    const ctx = useEventsApp();

    const received = () => ctx.service.createEvent.mock.calls[0];

    describe(`POST ${EVENTS_PATH}`, () => {
      asCase('valid', 'Staff submits a valid request').it('passes the caller, the data and the request context to the service', async () => {
        await runApiLayer(ctx.app, {
          method: 'post',
          path: EVENTS_PATH,
          body: VALID,
          headers: { 'User-Agent': 'portal-browser' },
        });
        expect(ctx.service.createEvent).toHaveBeenCalledTimes(1);
        const [caller, data, files, context] = received();
        expect(caller).toEqual(CALLER);
        expect(data).toMatchObject(VALID);
        expect(files).toBeUndefined();
        expect(context).toEqual(expect.objectContaining({ userAgent: 'portal-browser', ipAddress: expect.any(String) }));
      });

      asCase('valid', 'Staff enters every text field with surrounding spaces').it('trims every text field', async () => {
        await runApiLayer(ctx.app, {
          method: 'post',
          path: EVENTS_PATH,
          body: {
            ...VALID,
            title: `  ${VALID.title}  `,
            description: `  ${VALID.description}\n`,
            location: `  ${VALID.location}  `,
            organizer_name: `  ${VALID.organizer_name}  `,
            category: `  ${VALID.category}  `,
            department: '  College of Nursing  ',
            specified_category: '  Sportsfest  ',
          },
        });
        expect(received()[1]).toMatchObject({
          title: VALID.title,
          description: VALID.description,
          location: VALID.location,
          organizer_name: VALID.organizer_name,
          category: VALID.category,
          department: 'College of Nursing',
          specified_category: 'Sportsfest',
        });
      });

      asCase('valid', 'Staff leaves the optional fields out').it('fills the defaults for everything left out', async () => {
        await runApiLayer(ctx.app, { method: 'post', path: EVENTS_PATH, body: VALID });
        expect(received()[1]).toMatchObject({
          beneficiary_applicable: false,
          funds_donation: false,
          goods_donation: false,
          goods_types: [],
          event_images_existing: [],
          geojson: null,
        });
      });

      asCase('valid', 'Staff submits the multipart form, where every value is text').it('turns the form strings back into their real types', async () => {
        await postForm(ctx.app, {
          ...VALID_FORM,
          beneficiary_applicable: 'true',
          max_beneficiaries: '20',
          funds_donation: 'false',
          goods_donation: 'true',
          goods_types: ['Canned goods', 'Rice'],
          geojson: JSON.stringify(VALID_GEOJSON),
          area_sqm: '1250.5',
          marker_lat: '10.31',
          marker_lng: '123.89',
        });
        expect(received()[1]).toMatchObject({
          max_participants: VALID.max_participants,
          beneficiary_applicable: true,
          max_beneficiaries: 20,
          funds_donation: false,
          goods_donation: true,
          goods_types: ['Canned goods', 'Rice'],
          geojson: VALID_GEOJSON,
          area_sqm: 1250.5,
          marker_lat: 10.31,
          marker_lng: 123.89,
        });
      });

      asCase('valid', 'Staff selects a single goods type').it('makes a list of a goods type sent once', async () => {
        await postForm(ctx.app, { ...VALID_FORM, goods_donation: 'true', goods_types: 'Rice' });
        expect(received()[1]).toMatchObject({ goods_types: ['Rice'] });
      });

      asCase('valid', 'Staff uploads event images').it('hands the uploaded images to the service with their bytes', async () => {
        await postForm(ctx.app, VALID_FORM, [{ name: 'photo.jpg', type: 'image/jpeg', bytes: JPEG_BYTES }]);
        const files = received()[2];
        expect(files).toHaveLength(1);
        expect(files?.[0]).toMatchObject({ originalname: 'photo.jpg', mimetype: 'image/jpeg', size: JPEG_BYTES.length });
        expect(files?.[0].buffer.equals(JPEG_BYTES)).toBe(true);
      });

      asCase('valid', 'The service returns internal fields along with the result').it('keeps fields outside the response schema off the wire', async () => {
        ctx.service.createEvent.mockResolvedValueOnce({ ...EVENT_RESPONSE, created_by: 'caller-user-id' } as never);
        const outcome = await runApiLayer(ctx.app, { method: 'post', path: EVENTS_PATH, body: VALID });
        expect(outcome.status).toBe(201);
        expect(outcome.body.data).toEqual(EVENT_RESPONSE);
      });
    });
  });
}

/* ── security ────────────────────────────────────────────────────────────── */
{
  const fixtures: LayerFixture[] = [

    ...['max_beneficiaries', 'area_sqm', 'marker_lat', 'marker_lng'].flatMap((field) => [
    ]),

    ...['beneficiary_applicable', 'funds_donation', 'goods_donation'].flatMap((field) => [
    ]),

    ...['title', 'location', 'organizer_name', 'department', 'specified_category'].flatMap((field) => [
    ]),

    // Free text: stored as data through Prisma and escaped by the clients when rendered.
    ...[...SQL_INJECTION_PAYLOADS, ...specialCharacterSeries(), ...UNICODE_CONFUSABLE_PAYLOADS, ...XSS_PAYLOADS, ...PATH_TRAVERSAL_PAYLOADS].map(
      (p): LayerFixture => ({
        name: `description ← ${p.category}: ${p.label}`,
        // Padded past the minimum, so a payload is judged on its content and not on its length.
        input: { ...VALID, description: `Event details ${p.value as string}` },
        expected: 'PASS',
      }),
    ),
    // The field trims, so it is treated as sanitised: control characters must not get
    // through. The form encodes every line break as CRLF, so that is the exception.
    ...CONTROL_CHAR_PAYLOADS.filter((p) => p.label === 'CRLF injection').map((p): LayerFixture => ({
      name: `description ← ${p.category}: ${p.label}`,
      input: { ...VALID, description: `Event details ${p.value as string}` },
      expected: 'PASS',
      field: 'description',
    })),
  ];

  const IMAGE = { name: 'photo.jpg', type: 'image/jpeg', bytes: JPEG_BYTES };

  describe('events site · create — security', () => {
    const ctx = useEventsApp();

    describe(`POST ${EVENTS_PATH}`, () => {
      describeEventTable(ctx, fixtures);

      describe('uploaded files', () => {
        asCase('valid', 'Staff uploads the maximum of 3 event images').it('accepts the image limit', async () => {
          const res = await postForm(ctx.app, VALID_FORM, [IMAGE, IMAGE, IMAGE]);
          expect(res.status).toBe(201);
          expect(ctx.service.createEvent.mock.calls[0][2]).toHaveLength(3);
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

      asCase('valid', 'Staff uploads a JPEG or PNG event image', 'The image is stored').it.each([
        { title: 'a JPEG', file: upload('photo.jpg', 'image/jpeg', JPEG_BYTES) },
        { title: 'a PNG', file: upload('photo.png', 'image/png', PNG_BYTES) },
      ])('stores $title', async ({ file }) => {
        const { service, s3 } = build();
        await create(service, [file]);
        expect(s3.uploadToS3).toHaveBeenCalledTimes(1);
      });
    });
  });
}
