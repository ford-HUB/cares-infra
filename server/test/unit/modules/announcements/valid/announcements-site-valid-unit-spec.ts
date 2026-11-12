import { asCase } from '../../../../config/test-case';
import {
  AnnouncementAudience,
  AnnouncementChannel,
  AnnouncementState,
  AnnouncementTone,
} from '../../../../../src/infastructures/prisma/common/client';
import { LayerFixture, runApiLayer } from '../../../../config/layer-harness';
import {
  ANNOUNCEMENTS_PATH,
  ANNOUNCEMENT_RESPONSE,
  VALID_ANNOUNCEMENT as VALID,
  describeAnnouncementTable,
  useAnnouncementsApp,
  CALLER,
  VALID_ANNOUNCEMENT,
} from '../announcements-site-support';
import {
  CONTROL_CHAR_PAYLOADS,
  OPERATOR_INJECTION_PAYLOADS,
  PATH_TRAVERSAL_PAYLOADS,
  SQL_INJECTION_PAYLOADS,
  UNICODE_CONFUSABLE_PAYLOADS,
  XSS_PAYLOADS,
  specialCharacterSeries,
} from '../../../../config/security-payloads';

/**
 * Notices Module · Create Announcement — valid inputs.
 *
 * Every case here is a legitimate input the system must accept.
 * The invalid cases for this unit live in ../invalid/.
 */

/* ── input validation ────────────────────────────────────────────────────── */
{
  /**
   * Create announcement — input validation: every required field, length and list
   * boundaries, the states the editor may choose, the expiry-after-publish rule, and
   * legitimate inputs that must still pass.
   */
  const ALL_AUDIENCES = Object.values(AnnouncementAudience);
  const ALL_CHANNELS = Object.values(AnnouncementChannel);

  const fixtures: LayerFixture[] = [
    { name: 'draft with no expiry', input: VALID, expected: 'PASS' },
    {
      name: 'scheduled with every option set',
      input: {
        ...VALID,
        state: AnnouncementState.SCHEDULED,
        tone: AnnouncementTone.WARNING,
        audiences: ALL_AUDIENCES,
        channels: ALL_CHANNELS,
        expires_at: '2099-01-02T08:00:00.000Z',
        pinned: true,
        window_id: 'win-db-migration',
      },
      expected: 'PASS',
    },
    { name: 'title at min', input: { ...VALID, title: 'a' }, expected: 'PASS' },
    { name: 'title at max', input: { ...VALID, title: 'a'.repeat(200) }, expected: 'PASS' },
    { name: 'title at max once trimmed', input: { ...VALID, title: `  ${'a'.repeat(200)}  ` }, expected: 'PASS' },
    { name: 'title with an em dash', input: { ...VALID, title: 'Volunteers needed — Barangay Guadalupe outreach' }, expected: 'PASS' },
    { name: 'title with a time range', input: { ...VALID, title: 'CARES is offline tonight, 1:00–2:30 AM' }, expected: 'PASS' },
    { name: 'title with a version and dash', input: { ...VALID, title: 'Volunteer app 2.4 is out — update before your next event' }, expected: 'PASS' },
    { name: 'title with an apostrophe', input: { ...VALID, title: "Don't miss the outreach briefing!" }, expected: 'PASS' },
    { name: 'title with parentheses', input: { ...VALID, title: 'Scheduled maintenance (PH time)' }, expected: 'PASS' },
    { name: 'title with accents', input: { ...VALID, title: 'Salamat sa Señora' }, expected: 'PASS' },
    { name: 'title with an abbreviation before a comma', input: { ...VALID, title: 'Briefing at 8:00 a.m., Room 2' }, expected: 'PASS' },
    { name: 'title ending in a closing parenthesis and period', input: { ...VALID, title: 'Back online by noon (PH time).' }, expected: 'PASS' },
    { name: 'title with a percent sign', input: { ...VALID, title: '50% of slots are left' }, expected: 'PASS' },
    { name: 'body at min', input: { ...VALID, body: 'a' }, expected: 'PASS' },
    { name: 'body at max', input: { ...VALID, body: 'a'.repeat(4000) }, expected: 'PASS' },
    { name: 'body at max once trimmed', input: { ...VALID, body: `  ${'a'.repeat(4000)}  ` }, expected: 'PASS' },
    { name: 'body with line breaks', input: { ...VALID, body: 'Line one\n\nLine three' }, expected: 'PASS' },
    { name: 'body with accents and emoji', input: { ...VALID, body: 'Salamat, Señora! 🙏' }, expected: 'PASS' },

    // tone
    ...Object.values(AnnouncementTone).map((tone): LayerFixture => ({ name: `tone ${tone}`, input: { ...VALID, tone }, expected: 'PASS' })),
    { name: 'audiences all', input: { ...VALID, audiences: ALL_AUDIENCES }, expected: 'PASS' },
    { name: 'channels all', input: { ...VALID, channels: ALL_CHANNELS }, expected: 'PASS' },

    // state — publishing goes through the state endpoint, so the server stamps time and reach
    { name: 'state SCHEDULED', input: { ...VALID, state: AnnouncementState.SCHEDULED }, expected: 'PASS' },

    // publish_at
    { name: 'publish_at without milliseconds', input: { ...VALID, publish_at: '2099-01-01T08:00:00Z' }, expected: 'PASS' },

    // expires_at
    { name: 'expires_at one second after publish', input: { ...VALID, expires_at: '2099-01-01T08:00:01.000Z' }, expected: 'PASS' },

    // pinned
    { name: 'pinned true', input: { ...VALID, pinned: true }, expected: 'PASS' },

    // window_id — a slug such as win-db-migration, or null for no linked window
    { name: 'window_id slug', input: { ...VALID, window_id: 'win-db-migration' }, expected: 'PASS' },
    { name: 'window_id uuid', input: { ...VALID, window_id: 'b3f1c2d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d' }, expected: 'PASS' },
    { name: 'window_id at max', input: { ...VALID, window_id: 'a'.repeat(100) }, expected: 'PASS' },
  ];

  describe('announcements site · create — input validation', () => {
    const ctx = useAnnouncementsApp();

    describe(`POST ${ANNOUNCEMENTS_PATH}`, () => {
      describeAnnouncementTable(ctx, fixtures);

      asCase('valid', 'Staff submits a valid request').it('wraps the created announcement in the success envelope', async () => {
        const outcome = await runApiLayer(ctx.app, { method: 'post', path: ANNOUNCEMENTS_PATH, body: VALID });
        expect(outcome.status).toBe(201);
        expect(outcome.body).toEqual({ ok: true, message: 'Announcement created', data: ANNOUNCEMENT_RESPONSE });
      });
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
    { name: 'new notice saved as a draft', input: DIALOG_DRAFT, expected: 'PASS' },
    {
      name: 'scheduled outage notice with every option set',
      input: {
        ...DIALOG_DRAFT,
        state: AnnouncementState.SCHEDULED,
        tone: AnnouncementTone.CRITICAL,
        audiences: Object.values(AnnouncementAudience),
        channels: Object.values(AnnouncementChannel),
        expires_at: new Date('2099-01-01T19:30').toISOString(),
        pinned: true,
      },
      expected: 'PASS',
    },

    // Real titles from the maintenance board.
    { name: 'title of a migration window', input: { ...DIALOG_DRAFT, title: 'Database migration — attendance tables' }, expected: 'PASS' },
    { name: 'title of a storage window', input: { ...DIALOG_DRAFT, title: 'Media storage cutover finished' }, expected: 'PASS' },
    { name: 'title of a short pause', input: { ...DIALOG_DRAFT, title: 'Certificates pause briefly this Saturday' }, expected: 'PASS' },

    // Window ids: the ones on the board, and the shape saveMaintenanceWindow generates.
    { name: 'window_id on the board', input: { ...DIALOG_DRAFT, window_id: 'win-db-migration' }, expected: 'PASS' },
    { name: 'window_id on the board (worker)', input: { ...DIALOG_DRAFT, window_id: 'win-cert-worker' }, expected: 'PASS' },
    { name: 'window_id on the board (storage)', input: { ...DIALOG_DRAFT, window_id: 'win-storage-swap' }, expected: 'PASS' },
    { name: 'window_id as generated for a new window', input: { ...DIALOG_DRAFT, window_id: `win-${Date.now()}` }, expected: 'PASS' },
  ];

  describe('announcements site · create from maintenance', () => {
    const ctx = useAnnouncementsApp();

    describe(`POST ${ANNOUNCEMENTS_PATH}`, () => {
      describeAnnouncementTable(ctx, fixtures);

      asCase('valid', 'Staff submits a valid request').it('passes the linked window id to the service unchanged, with the caller as author', async () => {
        const body = { ...DIALOG_DRAFT, window_id: 'win-db-migration' };
        await runApiLayer(ctx.app, { method: 'post', path: ANNOUNCEMENTS_PATH, body });
        expect(ctx.service.createAnnouncement).toHaveBeenCalledWith(CALLER.sub, body);
      });
    });
  });
}

/* ── normalization ───────────────────────────────────────────────────────── */
{
  /**
   * Create announcement — normalisation: the schema trims the title and body, and the
   * service receives the caller from the token as the author.
   */
  describe('announcements site · create — normalisation', () => {
    const ctx = useAnnouncementsApp();

    describe(`POST ${ANNOUNCEMENTS_PATH}`, () => {
      asCase('valid', 'Staff enters the title and body with surrounding spaces').it('trims the title and body, and passes the caller as author', async () => {
        await runApiLayer(ctx.app, {
          method: 'post',
          path: ANNOUNCEMENTS_PATH,
          body: { ...VALID, title: `  ${VALID.title}  `, body: `  ${VALID.body}\n  ` },
        });
        expect(ctx.service.createAnnouncement).toHaveBeenCalledTimes(1);
        expect(ctx.service.createAnnouncement).toHaveBeenCalledWith(CALLER.sub, VALID);
      });

      asCase('valid', 'Staff enters a body spanning several lines').it('keeps line breaks inside the body', async () => {
        const body = 'Line one\n\nLine three';
        await runApiLayer(ctx.app, { method: 'post', path: ANNOUNCEMENTS_PATH, body: { ...VALID, body } });
        expect(ctx.service.createAnnouncement.mock.calls[0][1].body).toBe(body);
      });
    });
  });
}

/* ── security ────────────────────────────────────────────────────────────── */
{
  const fixtures: LayerFixture[] = [

    // Free text: stored as data through Prisma and escaped by the clients when rendered.
    ...[...SQL_INJECTION_PAYLOADS, ...specialCharacterSeries(), ...UNICODE_CONFUSABLE_PAYLOADS, ...XSS_PAYLOADS, ...PATH_TRAVERSAL_PAYLOADS].map(
      (p): LayerFixture => ({
        name: `body ← ${p.category}: ${p.label}`,
        input: { ...VALID, body: p.value },
        expected: 'PASS',
      }),
    ),
    // The field trims, so it is treated as sanitised: control characters must not get
    // through. A notice can run over several lines, so line breaks are the exception.
    ...CONTROL_CHAR_PAYLOADS.filter((p) => p.label === 'CRLF injection').map((p): LayerFixture => ({
      name: `body ← ${p.category}: ${p.label}`,
      input: { ...VALID, body: p.value },
      expected: 'PASS',
      field: 'body',
    })),

    ...OPERATOR_INJECTION_PAYLOADS.filter((p) => typeof p.value === 'boolean').map((p): LayerFixture => ({
      name: `pinned ← ${p.category}: ${p.label}`,
      // The catalogue's "boolean instead of string" is a real value for this field.
      input: { ...VALID, pinned: p.value },
      expected: 'PASS',
      ...(typeof p.value === 'boolean' ? {} : { field: 'pinned' }),
    })),
  ];

  describe('announcements site · create — security', () => {
    const ctx = useAnnouncementsApp();

    describe(`POST ${ANNOUNCEMENTS_PATH}`, () => {
      describeAnnouncementTable(ctx, fixtures);
    });
  });
}
