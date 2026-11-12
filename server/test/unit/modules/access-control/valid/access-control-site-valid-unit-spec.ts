import { asCase } from '../../../../config/test-case';
import { LayerFixture, runApiLayer } from '../../../../config/layer-harness';
import {
  ALL_PERMISSIONS,
  USER_DETAIL_RESPONSE,
  VALID_EXPIRY,
  VALID_SUSPENSION,
  VALID_USER_ID,
  describeSuspensionTable,
  describeUserIdTable,
  suspendPath,
  useAccessControlApp,
  CALLER,
} from '../access-control-site-support';
import {
  CONTROL_CHAR_PAYLOADS,
  PATH_TRAVERSAL_PAYLOADS,
  SQL_INJECTION_PAYLOADS,
  UNICODE_CONFUSABLE_PAYLOADS,
  XSS_PAYLOADS,
  specialCharacterSeries,
} from '../../../../config/security-payloads';

/**
 * Access Control Module · Suspend User Actions — valid inputs.
 *
 * Every case here is a legitimate input the system must accept.
 * The invalid cases for this unit live in ../invalid/.
 */

/* ── input validation ────────────────────────────────────────────────────── */
{
  /**
   * Access Control Suspend — input validation: the user id path param, the permission
   * list, the reason's required and length rules, the expiry format, and legitimate
   * inputs that must still pass.
   */
  const userIdFixtures: LayerFixture<string>[] = [
    { name: 'valid uuid', input: VALID_USER_ID, expected: 'PASS' },
    { name: 'upper-case uuid', input: VALID_USER_ID.toUpperCase(), expected: 'PASS' },
  ];

  const bodyFixtures: LayerFixture[] = [
    { name: 'minimal body (stays until lifted)', input: VALID_SUSPENSION, expected: 'PASS' },
    { name: 'every field', input: { ...VALID_SUSPENSION, expires_at: VALID_EXPIRY }, expected: 'PASS' },
    { name: 'permissions all keys', input: { ...VALID_SUSPENSION, permissions: ALL_PERMISSIONS }, expected: 'PASS' },
    { name: 'reason at min', input: { ...VALID_SUSPENSION, reason: 'a'.repeat(10) }, expected: 'PASS' },
    { name: 'reason at max', input: { ...VALID_SUSPENSION, reason: 'a'.repeat(500) }, expected: 'PASS' },
    { name: 'reason at max once trimmed', input: { ...VALID_SUSPENSION, reason: `  ${'a'.repeat(500)}  ` }, expected: 'PASS' },
    { name: 'reason with line breaks', input: { ...VALID_SUSPENSION, reason: 'First incident\nSecond incident' }, expected: 'PASS' },
    { name: 'reason with accents and emoji', input: { ...VALID_SUSPENSION, reason: 'Paglabag sa patakaran — señor 🙏' }, expected: 'PASS' },

    // expires_at: UTC ISO-8601, the shape the portal's toISOString() produces
    { name: 'expires_at without milliseconds', input: { ...VALID_SUSPENSION, expires_at: '2099-01-01T00:00:00Z' }, expected: 'PASS' },
    // Whether it is in the future is the service's call, because it depends on the clock.
    { name: 'expires_at in the past', input: { ...VALID_SUSPENSION, expires_at: '2000-01-01T00:00:00.000Z' }, expected: 'PASS' },
  ];

  describe('access control site · suspend — input validation', () => {
    const ctx = useAccessControlApp();

    describe('POST /api/v1/access-control/users/:id/suspensions', () => {
      describe('id', () => describeUserIdTable(ctx, userIdFixtures));
      describe('body', () => describeSuspensionTable(ctx, bodyFixtures));

      asCase('valid', 'Staff submits a valid request').it('wraps the updated rights in the success envelope', async () => {
        const outcome = await runApiLayer(ctx.app, { method: 'post', path: suspendPath(), body: VALID_SUSPENSION });
        expect(outcome.status).toBe(201);
        expect(outcome.body).toEqual({ ok: true, message: 'Actions suspended', data: USER_DETAIL_RESPONSE });
      });
    });
  });
}

/* ── normalization ───────────────────────────────────────────────────────── */
{
  /**
   * Access Control Suspend — normalisation: what the handler gives the service after
   * the schema has trimmed the reason, with the caller from the token and the target
   * from the path.
   */
  const REQUEST_CONTEXT = expect.objectContaining({ ipAddress: expect.any(String) });

  describe('access control site · suspend — normalisation', () => {
    const ctx = useAccessControlApp();

    describe('POST /api/v1/access-control/users/:id/suspensions', () => {
      asCase('valid', 'Staff enters the reason with surrounding spaces').it('trims the reason and passes the caller, the id and the request context', async () => {
        await runApiLayer(ctx.app, {
          method: 'post',
          path: suspendPath(),
          body: { ...VALID_SUSPENSION, reason: `  ${VALID_SUSPENSION.reason}\n  ` },
        });
        expect(ctx.service.suspendActions).toHaveBeenCalledWith(CALLER, VALID_USER_ID, VALID_SUSPENSION, REQUEST_CONTEXT);
      });

      asCase('valid', 'Staff sets an expiry on the suspension').it('passes the expiry through unchanged', async () => {
        await runApiLayer(ctx.app, {
          method: 'post',
          path: suspendPath(),
          body: { ...VALID_SUSPENSION, expires_at: VALID_EXPIRY },
        });
        expect(ctx.service.suspendActions.mock.calls[0][2].expires_at).toBe(VALID_EXPIRY);
      });

      asCase('valid', 'Staff leaves the optional fields out').it('adds no expiry of its own when none is given', async () => {
        await runApiLayer(ctx.app, { method: 'post', path: suspendPath(), body: VALID_SUSPENSION });
        expect(ctx.service.suspendActions.mock.calls[0][2]).not.toHaveProperty('expires_at');
      });

      // Removing duplicates is the service's job, so the list arrives as it was sent.
      asCase('valid', 'Staff selects the same permission twice').it('leaves repeated permissions for the service to collapse', async () => {
        const permissions = [ALL_PERMISSIONS[0], ALL_PERMISSIONS[0]];
        await runApiLayer(ctx.app, { method: 'post', path: suspendPath(), body: { ...VALID_SUSPENSION, permissions } });
        expect(ctx.service.suspendActions.mock.calls[0][2].permissions).toEqual(permissions);
      });
    });
  });
}

/* ── security ────────────────────────────────────────────────────────────── */
{
  /**
   * Access Control Suspend — security, per field class:
   *   id, permissions, expires_at   constrained: every hostile string FAILs
   *   reason                        free text, trimmed: control characters FAIL, line breaks stay
   * plus type confusion, mass assignment and prototype pollution.
   */
  /** Keeps a reason payload above the 10-character minimum so length is never the reason it fails. */
  const REASON_PREFIX = 'Reported incident:';

  const bodyFixtures: LayerFixture[] = [

    // Free text: stored as data through Prisma and escaped by the portal when rendered.
    ...[...SQL_INJECTION_PAYLOADS, ...specialCharacterSeries(), ...UNICODE_CONFUSABLE_PAYLOADS, ...XSS_PAYLOADS, ...PATH_TRAVERSAL_PAYLOADS].map(
      (p): LayerFixture => ({
        name: `reason ← ${p.category}: ${p.label}`,
        input: { ...VALID_SUSPENSION, reason: `${REASON_PREFIX} ${p.value as string}` },
        expected: 'PASS',
      }),
    ),
    // The field trims, so it is treated as sanitised: control characters must not get
    // through. A reason can run over several lines, so line breaks are the exception.
    ...CONTROL_CHAR_PAYLOADS.filter((p) => p.label === 'CRLF injection').map((p): LayerFixture => ({
      name: `reason ← ${p.category}: ${p.label}`,
      input: { ...VALID_SUSPENSION, reason: `${REASON_PREFIX} ${p.value as string}` },
      expected: 'PASS',
      field: 'reason',
    })),
  ];

  describe('access control site · suspend — security', () => {
    const ctx = useAccessControlApp();

    describe('POST /api/v1/access-control/users/:id/suspensions', () => {
      describe('body', () => describeSuspensionTable(ctx, bodyFixtures));
    });
  });
}
