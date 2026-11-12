import { asCase } from '../../../../config/test-case';
import { NotFoundException } from '@nestjs/common';
import {
  expectSafeErrorEnvelope,
  runApiLayer,
  LayerFixture,
  expectValidationEnvelope,
  runSchemaLayer,
  withPollution,
} from '../../../../config/layer-harness';
import {
  ANNOUNCEMENTS_PATH,
  VALID_ANNOUNCEMENT,
  useAnnouncementsApp,
  VALID_ANNOUNCEMENT as VALID,
  describeAnnouncementTable,
} from '../announcements-site-support';
import {
  AnnouncementAudience,
  AnnouncementChannel,
  AnnouncementState,
  PermissionKey,
} from '../../../../../src/infastructures/prisma/common/client';
import { AnnouncementsSiteController } from '../../../../../src/modules/announcements/controllers/announcements-site-controller';
import { PERMISSIONS_KEY } from '../../../../../src/shared/decorators/require-permission-decorator';
import { SaveAnnouncementSchema } from '../../../../../src/modules/announcements/validators/announcements-site-validator';
import {
  CONTROL_CHAR_PAYLOADS,
  HOSTILE_STRINGS,
  MASS_ASSIGNMENT_KEYS,
  OPERATOR_INJECTION_PAYLOADS,
  PROTOTYPE_POLLUTION_BODIES,
  SQL_INJECTION_PAYLOADS,
  XSS_PAYLOADS,
  specialCharacterSeries,
} from '../../../../config/security-payloads';

/**
 * Notices Module · Create Announcement — invalid inputs.
 *
 * Every case here is an intentionally wrong input. A case Passes when the system
 * refuses it exactly as stated — a rejection as expected is the correct result.
 * The valid cases for this unit live in ../valid/.
 */

/* ── error handling ──────────────────────────────────────────────────────── */
{
  /**
   * Create announcement — error handling: an unexpected service error is masked as a
   * generic 500 with nothing leaked, and the service's deliberate 404 keeps its status
   * and message through the envelope.
   */
  describe('announcements site · create — error handling', () => {
    const ctx = useAnnouncementsApp();

    describe(`POST ${ANNOUNCEMENTS_PATH}`, () => {
      const create = () =>
        runApiLayer(ctx.app, { method: 'post', path: ANNOUNCEMENTS_PATH, body: VALID_ANNOUNCEMENT });

      asCase('invalid', 'The service fails with an unexpected internal or database error').it('masks an unexpected service error as a 500 without leaking detail', async () => {
        ctx.service.createAnnouncement.mockRejectedValueOnce(new Error('syntax error at or near "OR"'));
        const outcome = await create();
        expect(outcome.status).toBe(500);
        expectSafeErrorEnvelope(outcome);
        expect(outcome.body).toEqual({ ok: false, message: 'Internal server error' });
      });

      asCase('invalid', 'Request made when the signed-in account no longer exists', 'Request fails with 404; status and message are kept in the { ok: false } envelope').it('keeps the 404 when the signed-in account no longer exists', async () => {
        ctx.service.createAnnouncement.mockRejectedValueOnce(new NotFoundException('Signed-in account not found'));
        const outcome = await create();
        expect(outcome.status).toBe(404);
        expectSafeErrorEnvelope(outcome);
        expect(outcome.body.message).toBe('Signed-in account not found');
      });
    });
  });
}

/* ── input validation ────────────────────────────────────────────────────── */
{
  /**
   * Create announcement — input validation: every required field, length and list
   * boundaries, the states the editor may choose, the expiry-after-publish rule, and
   * legitimate inputs that must still pass.
   */
  const ALL_AUDIENCES = Object.values(AnnouncementAudience);
  const ALL_CHANNELS = Object.values(AnnouncementChannel);

  /** Every field is required, including the nullable ones. */
  const missing = (field: keyof typeof VALID): LayerFixture => {
    const { [field]: _omitted, ...input } = VALID;
    return { name: `${field} missing`, input, expected: 'FAIL', field };
  };

  const fixtures: LayerFixture[] = [
    ...(Object.keys(VALID) as (keyof typeof VALID)[]).map(missing),

    // title — real notices use dashes, times, apostrophes and version numbers
    { name: 'title empty', input: { ...VALID, title: '' }, expected: 'FAIL', field: 'title', message: 'Title is required' },
    { name: 'title whitespace-only', input: { ...VALID, title: '   ' }, expected: 'FAIL', field: 'title', message: 'Title is required' },
    { name: 'title over max', input: { ...VALID, title: 'a'.repeat(201) }, expected: 'FAIL', field: 'title' },

    // body
    { name: 'body empty', input: { ...VALID, body: '' }, expected: 'FAIL', field: 'body', message: 'Message is required' },
    { name: 'body whitespace-only', input: { ...VALID, body: ' \n ' }, expected: 'FAIL', field: 'body', message: 'Message is required' },
    { name: 'body over max', input: { ...VALID, body: 'a'.repeat(4001) }, expected: 'FAIL', field: 'body' },
    { name: 'tone unknown', input: { ...VALID, tone: 'URGENT' }, expected: 'FAIL', field: 'tone' },
    { name: 'tone wrong case', input: { ...VALID, tone: 'info' }, expected: 'FAIL', field: 'tone' },

    // audiences — no more entries than there are audiences to pick
    { name: 'audiences empty', input: { ...VALID, audiences: [] }, expected: 'FAIL', field: 'audiences', message: 'Pick at least one audience' },
    { name: 'audiences over max', input: { ...VALID, audiences: [...ALL_AUDIENCES, ALL_AUDIENCES[0]] }, expected: 'FAIL', field: 'audiences' },
    { name: 'audiences unknown', input: { ...VALID, audiences: ['EVERYONE'] }, expected: 'FAIL', field: 'audiences.0' },
    { name: 'audiences as one string, not a list', input: { ...VALID, audiences: ALL_AUDIENCES[0] }, expected: 'FAIL', field: 'audiences' },

    // channels — no more entries than there are channels to pick
    { name: 'channels empty', input: { ...VALID, channels: [] }, expected: 'FAIL', field: 'channels', message: 'Pick at least one channel' },
    { name: 'channels over max', input: { ...VALID, channels: [...ALL_CHANNELS, ALL_CHANNELS[0]] }, expected: 'FAIL', field: 'channels' },
    { name: 'channels unknown', input: { ...VALID, channels: ['SMS'] }, expected: 'FAIL', field: 'channels.0' },
    { name: 'channels as one string, not a list', input: { ...VALID, channels: ALL_CHANNELS[0] }, expected: 'FAIL', field: 'channels' },
    { name: 'state PUBLISHED cannot be chosen here', input: { ...VALID, state: AnnouncementState.PUBLISHED }, expected: 'FAIL', field: 'state' },
    { name: 'state EXPIRED cannot be chosen here', input: { ...VALID, state: AnnouncementState.EXPIRED }, expected: 'FAIL', field: 'state' },
    { name: 'state wrong case', input: { ...VALID, state: 'draft' }, expected: 'FAIL', field: 'state' },
    { name: 'publish_at null', input: { ...VALID, publish_at: null }, expected: 'FAIL', field: 'publish_at' },
    { name: 'publish_at empty', input: { ...VALID, publish_at: '' }, expected: 'FAIL', field: 'publish_at' },
    { name: 'publish_at date only', input: { ...VALID, publish_at: '2099-01-01' }, expected: 'FAIL', field: 'publish_at' },
    { name: 'publish_at with a local offset', input: { ...VALID, publish_at: '2099-01-01T16:00:00+08:00' }, expected: 'FAIL', field: 'publish_at' },
    { name: 'publish_at impossible date', input: { ...VALID, publish_at: '2099-02-30T08:00:00.000Z' }, expected: 'FAIL', field: 'publish_at' },
    { name: 'publish_at as an epoch number', input: { ...VALID, publish_at: 4070908800000 }, expected: 'FAIL', field: 'publish_at' },
    { name: 'expires_at same as publish', input: { ...VALID, expires_at: VALID.publish_at }, expected: 'FAIL', field: 'expires_at', message: 'Expiry must come after the publish time' },
    { name: 'expires_at before publish', input: { ...VALID, expires_at: '2098-01-01T08:00:00.000Z' }, expected: 'FAIL', field: 'expires_at', message: 'Expiry must come after the publish time' },
    { name: 'expires_at empty', input: { ...VALID, expires_at: '' }, expected: 'FAIL', field: 'expires_at' },
    { name: 'expires_at date only', input: { ...VALID, expires_at: '2099-01-02' }, expected: 'FAIL', field: 'expires_at' },
    { name: 'pinned as a string', input: { ...VALID, pinned: 'true' }, expected: 'FAIL', field: 'pinned' },
    { name: 'pinned as a number', input: { ...VALID, pinned: 1 }, expected: 'FAIL', field: 'pinned' },
    { name: 'pinned null', input: { ...VALID, pinned: null }, expected: 'FAIL', field: 'pinned' },
    { name: 'window_id over max', input: { ...VALID, window_id: 'a'.repeat(101) }, expected: 'FAIL', field: 'window_id' },
    { name: 'window_id empty', input: { ...VALID, window_id: '' }, expected: 'FAIL', field: 'window_id' },
  ];

  describe('announcements site · create — input validation', () => {
    const ctx = useAnnouncementsApp();

    describe(`POST ${ANNOUNCEMENTS_PATH}`, () => {
      describeAnnouncementTable(ctx, fixtures);
    });
  });
}

/* ── maintenance ─────────────────────────────────────────────────────────── */
{
  /**
   * Create announcement from the portal's Maintenance screen (System). It shares
   * `AnnouncementDialog` and POST /api/v1/announcements with the Notices screen, so the
   * field rules and attack strings live in the other specs in this folder. This one
   * covers what is particular to Maintenance: the bodies its dialog really builds, and
   * the window ids it generates.
   */

  /** What `blankAnnouncement()` and `toApiDraft()` send for a new notice, as the dialog fills it in. */
  const DIALOG_DRAFT = {
    ...VALID_ANNOUNCEMENT,
    title: 'CARES is offline tonight, 1:00–2:30 AM',
    body: 'The portal and the app are unavailable while the database is migrated.',
    publish_at: new Date('2099-01-01T17:00').toISOString(),
  };

  const fixtures: LayerFixture[] = [

    // The dialog only offers draft or schedule; a window cannot publish a notice directly.
    { name: 'publishing straight from the dialog', input: { ...DIALOG_DRAFT, state: AnnouncementState.PUBLISHED }, expected: 'FAIL', field: 'state' },
  ];

  describe('announcements site · create from maintenance', () => {
    const ctx = useAnnouncementsApp();

    describe(`POST ${ANNOUNCEMENTS_PATH}`, () => {
      describeAnnouncementTable(ctx, fixtures);

      // The route is gated on the notices right, not the right that opens the Maintenance
      // page. This records that today's rule is deliberate-looking, not that it is right.
      asCase('invalid', 'Staff with only the maintenance right posts a maintenance notice').it('requires the notices right, not the maintenance right', () => {
        const required = Reflect.getMetadata(
          PERMISSIONS_KEY,
          AnnouncementsSiteController.prototype.createAnnouncement,
        );
        expect(required).toEqual([PermissionKey.SYSTEM_NOTICE_MANAGE]);
      });
    });
  });
}

/* ── security ────────────────────────────────────────────────────────────── */
{
  /**
   * Create announcement — security, per field class:
   *   tone, audiences, channels, state, publish_at, expires_at, window_id
   *              constrained: every hostile string FAILs
   *   title      short label: SQLi, special-char series, control chars, XSS FAIL
   *   body       free text, trimmed: control characters FAIL, line breaks stay
   *   pinned     boolean: strings and objects FAIL
   * plus type confusion, mass assignment and prototype pollution.
   */
  const rejectHostile = (field: string, wrap: (value: unknown) => unknown = (value) => value, issuePath = field): LayerFixture[] =>
    HOSTILE_STRINGS.map((p) => ({
      name: `${field} ← ${p.category}: ${p.label}`,
      input: { ...VALID, [field]: wrap(p.value) },
      expected: 'FAIL',
      field: issuePath,
    }));

  /** `null` is a real value on the nullable fields, and is exercised as a PASS elsewhere. */
  const typeConfusion = (field: string, { nullable = false, list = false } = {}): LayerFixture[] =>
    OPERATOR_INJECTION_PAYLOADS.filter((p) => !(nullable && p.value === null)).map((p) => ({
      name: `${field} ← ${p.category}: ${p.label}`,
      input: { ...VALID, [field]: p.value },
      expected: 'FAIL',
      field: list && Array.isArray(p.value) ? `${field}.0` : field,
    }));

  const fixtures: LayerFixture[] = [
    ...rejectHostile('tone'),
    ...typeConfusion('tone'),

    ...rejectHostile('audiences', (value) => [value], 'audiences.0'),
    ...typeConfusion('audiences', { list: true }),

    ...rejectHostile('channels', (value) => [value], 'channels.0'),
    ...typeConfusion('channels', { list: true }),

    ...rejectHostile('state'),
    ...typeConfusion('state'),

    ...rejectHostile('publish_at'),
    ...typeConfusion('publish_at'),

    ...rejectHostile('expires_at'),
    ...typeConfusion('expires_at', { nullable: true }),

    ...rejectHostile('window_id'),
    ...typeConfusion('window_id', { nullable: true }),

    ...[...SQL_INJECTION_PAYLOADS, ...specialCharacterSeries(), ...CONTROL_CHAR_PAYLOADS, ...XSS_PAYLOADS].map(
      (p): LayerFixture => ({
        name: `title ← ${p.category}: ${p.label}`,
        input: { ...VALID, title: p.value },
        expected: 'FAIL',
        field: 'title',
      }),
    ),
    ...typeConfusion('title'),
    // The field trims, so it is treated as sanitised: control characters must not get
    // through. A notice can run over several lines, so line breaks are the exception.
    ...CONTROL_CHAR_PAYLOADS.filter((p) => !(p.label === 'CRLF injection')).map((p): LayerFixture => ({
      name: `body ← ${p.category}: ${p.label}`,
      input: { ...VALID, body: p.value },
      expected: 'FAIL',
      field: 'body',
    })),
    ...typeConfusion('body'),

    ...OPERATOR_INJECTION_PAYLOADS.filter((p) => !(typeof p.value === 'boolean')).map((p): LayerFixture => ({
      name: `pinned ← ${p.category}: ${p.label}`,
      // The catalogue's "boolean instead of string" is a real value for this field.
      input: { ...VALID, pinned: p.value },
      expected: 'FAIL',
      ...(typeof p.value === 'boolean' ? {} : { field: 'pinned' }),
    })),

    ...MASS_ASSIGNMENT_KEYS.map((extra): LayerFixture => ({
      name: `mass assignment: ${Object.keys(extra).join(', ')}`,
      input: { ...VALID, ...extra },
      expected: 'FAIL',
    })),
    // The server sets the author, the reach and the timestamps; none can be supplied.
    { name: 'mass assignment: author_id', input: { ...VALID, author_id: 'someone-else' }, expected: 'FAIL' },
    { name: 'mass assignment: author_name', input: { ...VALID, author_name: 'The Director' }, expected: 'FAIL' },
    { name: 'mass assignment: reach', input: { ...VALID, reach: 100000 }, expected: 'FAIL' },
    { name: 'mass assignment: announcement_id', input: { ...VALID, announcement_id: 'chosen-id' }, expected: 'FAIL' },
    { name: 'mass assignment: created_at', input: { ...VALID, created_at: VALID.publish_at }, expected: 'FAIL' },
  ];

  describe('announcements site · create — security', () => {
    const ctx = useAnnouncementsApp();

    describe(`POST ${ANNOUNCEMENTS_PATH}`, () => {
      describeAnnouncementTable(ctx, fixtures);

      asCase('invalid', 'Attacker adds a role_type field to the body', 'Rejected and reported as unrecognized_keys').it('mass assignment is reported as unrecognized_keys', async () => {
        const outcome = await runSchemaLayer(SaveAnnouncementSchema, { ...VALID, reach: 100000 });
        expect(outcome.issues).toEqual(
          expect.arrayContaining([expect.objectContaining({ code: 'unrecognized_keys' })]),
        );
      });

      asCase('invalid', 'Attacker sends a __proto__ / constructor.prototype body', 'Request rejected (400); Object.prototype is not polluted').it.each(PROTOTYPE_POLLUTION_BODIES)('FAIL · prototype pollution: $label', async (p) => {
        const outcome = await runApiLayer(ctx.app, {
          method: 'post',
          path: ANNOUNCEMENTS_PATH,
          rawBody: withPollution(VALID, p.value as string),
        });
        expect(outcome.verdict).toBe('FAIL');
        expectValidationEnvelope(outcome);
        expect(ctx.service.createAnnouncement).not.toHaveBeenCalled();
        expect(({} as any).isAdmin).toBeUndefined();
      });
    });
  });
}
