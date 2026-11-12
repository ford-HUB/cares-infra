import { asCase } from '../../../../config/test-case';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  expectSafeErrorEnvelope,
  runApiLayer,
  LayerFixture,
  expectValidationEnvelope,
  runSchemaLayer,
  withPollution,
} from '../../../../config/layer-harness';
import {
  VALID_SUSPENSION,
  suspendPath,
  useAccessControlApp,
  ALL_PERMISSIONS,
  VALID_EXPIRY,
  VALID_USER_ID,
  describeSuspensionTable,
  describeUserIdTable,
} from '../access-control-site-support';
import { SuspendActionsSchema } from '../../../../../src/modules/access-control/validators/access-control-site-validator';
import {
  CONTROL_CHAR_PAYLOADS,
  HOSTILE_STRINGS,
  MASS_ASSIGNMENT_KEYS,
  OPERATOR_INJECTION_PAYLOADS,
  PROTOTYPE_POLLUTION_BODIES,
} from '../../../../config/security-payloads';

/**
 * Access Control Module · Suspend User Actions — invalid inputs.
 *
 * Every case here is an intentionally wrong input. A case Passes when the system
 * refuses it exactly as stated — a rejection as expected is the correct result.
 * The valid cases for this unit live in ../valid/.
 */

/* ── error handling ──────────────────────────────────────────────────────── */
{
  /**
   * Access Control Suspend — error handling: unexpected service errors are masked as
   * a generic 500 with nothing leaked, and the service's deliberate HttpExceptions
   * keep their status and message through the envelope.
   */
  const DELIBERATE_ERRORS = [
    { title: '400 for suspending your own actions', error: new BadRequestException('You cannot suspend your own actions') },
    { title: '400 for a non-portal account', error: new BadRequestException('Only portal accounts carry feature rights') },
    { title: '400 for an expiry in the past', error: new BadRequestException('The expiry must be in the future') },
    {
      title: '403 for the root administrator',
      error: new ForbiddenException('The root administrator account cannot have its actions suspended'),
    },
    { title: '404 for an unknown user', error: new NotFoundException('User not found') },
  ];

  describe('access control site · suspend — error handling', () => {
    const ctx = useAccessControlApp();

    describe('POST /api/v1/access-control/users/:id/suspensions', () => {
      const suspend = () => runApiLayer(ctx.app, { method: 'post', path: suspendPath(), body: VALID_SUSPENSION });

      asCase('invalid', 'The service fails with an unexpected internal or database error').it('masks an unexpected service error as a 500 without leaking detail', async () => {
        ctx.service.suspendActions.mockRejectedValueOnce(new Error('syntax error at or near "OR"'));
        const outcome = await suspend();
        expect(outcome.status).toBe(500);
        expectSafeErrorEnvelope(outcome);
        expect(outcome.body).toEqual({ ok: false, message: 'Internal server error' });
      });

      asCase('invalid', 'The service refuses the request with a deliberate HTTP error (each kind)', 'Each deliberate error keeps its status and message in the { ok: false } envelope').it.each(DELIBERATE_ERRORS)('keeps the $title', async ({ error }) => {
        ctx.service.suspendActions.mockRejectedValueOnce(error);
        const outcome = await suspend();
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
   * Access Control Suspend — input validation: the user id path param, the permission
   * list, the reason's required and length rules, the expiry format, and legitimate
   * inputs that must still pass.
   */
  const userIdFixtures: LayerFixture<string>[] = [
    { name: 'not a uuid', input: 'user-1', expected: 'FAIL' },
    { name: 'uuid missing a character', input: VALID_USER_ID.slice(0, -1), expected: 'FAIL' },
    { name: 'uuid without hyphens', input: VALID_USER_ID.replace(/-/g, ''), expected: 'FAIL' },
    { name: 'uuid with surrounding spaces', input: ` ${VALID_USER_ID} `, expected: 'FAIL' },
    { name: 'numeric id', input: '42', expected: 'FAIL' },
  ];

  const bodyFixtures: LayerFixture[] = [

    // permissions
    { name: 'permissions missing', input: { reason: VALID_SUSPENSION.reason }, expected: 'FAIL', field: 'permissions' },
    { name: 'permissions empty', input: { ...VALID_SUSPENSION, permissions: [] }, expected: 'FAIL', field: 'permissions', message: 'Select at least one action to suspend' },
    // Same ceiling as the other permission lists in this module: no more entries than keys.
    { name: 'permissions over max', input: { ...VALID_SUSPENSION, permissions: [...ALL_PERMISSIONS, ALL_PERMISSIONS[0]] }, expected: 'FAIL', field: 'permissions' },
    { name: 'permissions unknown key', input: { ...VALID_SUSPENSION, permissions: ['ALL'] }, expected: 'FAIL', field: 'permissions.0' },
    { name: 'permissions wrong case', input: { ...VALID_SUSPENSION, permissions: [ALL_PERMISSIONS[0].toLowerCase()] }, expected: 'FAIL', field: 'permissions.0' },
    { name: 'permissions as one string, not a list', input: { ...VALID_SUSPENSION, permissions: ALL_PERMISSIONS[0] }, expected: 'FAIL', field: 'permissions' },
    { name: 'permissions with one bad key among good', input: { ...VALID_SUSPENSION, permissions: [ALL_PERMISSIONS[0], 'ALL'] }, expected: 'FAIL', field: 'permissions.1' },

    // reason
    { name: 'reason missing', input: { permissions: VALID_SUSPENSION.permissions }, expected: 'FAIL', field: 'reason' },
    { name: 'reason empty', input: { ...VALID_SUSPENSION, reason: '' }, expected: 'FAIL', field: 'reason', message: 'Describe the violation in at least 10 characters' },
    { name: 'reason whitespace-only', input: { ...VALID_SUSPENSION, reason: ' '.repeat(12) }, expected: 'FAIL', field: 'reason' },
    { name: 'reason one under min', input: { ...VALID_SUSPENSION, reason: 'a'.repeat(9) }, expected: 'FAIL', field: 'reason' },
    { name: 'reason under min once trimmed', input: { ...VALID_SUSPENSION, reason: `   ${'a'.repeat(9)}   ` }, expected: 'FAIL', field: 'reason' },
    { name: 'reason over max', input: { ...VALID_SUSPENSION, reason: 'a'.repeat(501) }, expected: 'FAIL', field: 'reason' },
    { name: 'expires_at empty', input: { ...VALID_SUSPENSION, expires_at: '' }, expected: 'FAIL', field: 'expires_at' },
    { name: 'expires_at date only', input: { ...VALID_SUSPENSION, expires_at: '2099-01-01' }, expected: 'FAIL', field: 'expires_at' },
    { name: 'expires_at with a local offset', input: { ...VALID_SUSPENSION, expires_at: '2099-01-01T08:00:00+08:00' }, expected: 'FAIL', field: 'expires_at' },
    { name: 'expires_at impossible month', input: { ...VALID_SUSPENSION, expires_at: '2099-13-01T00:00:00.000Z' }, expected: 'FAIL', field: 'expires_at' },
    { name: 'expires_at impossible day', input: { ...VALID_SUSPENSION, expires_at: '2099-02-30T00:00:00.000Z' }, expected: 'FAIL', field: 'expires_at' },
    { name: 'expires_at as an epoch number', input: { ...VALID_SUSPENSION, expires_at: 4070908800000 }, expected: 'FAIL', field: 'expires_at' },
  ];

  describe('access control site · suspend — input validation', () => {
    const ctx = useAccessControlApp();

    describe('POST /api/v1/access-control/users/:id/suspensions', () => {
      describe('id', () => describeUserIdTable(ctx, userIdFixtures));
      describe('body', () => describeSuspensionTable(ctx, bodyFixtures));
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

  const userIdFixtures: LayerFixture<string>[] = [
    ...HOSTILE_STRINGS.map((p): LayerFixture<string> => ({
      name: `id ← ${p.category}: ${p.label}`,
      input: p.value as string,
      expected: 'FAIL',
    })),
    { name: 'id ← uuid with SQL tail', input: `${VALID_USER_ID}' OR '1'='1`, expected: 'FAIL' },
    { name: 'id ← uuid with stacked query', input: `${VALID_USER_ID}; DROP TABLE "User"`, expected: 'FAIL' },
  ];

  const bodyFixtures: LayerFixture[] = [
    ...HOSTILE_STRINGS.map((p): LayerFixture => ({
      name: `permissions ← ${p.category}: ${p.label}`,
      input: { ...VALID_SUSPENSION, permissions: [p.value] },
      expected: 'FAIL',
      field: 'permissions.0',
    })),
    ...OPERATOR_INJECTION_PAYLOADS.map((p): LayerFixture => ({
      name: `permissions ← ${p.category}: ${p.label}`,
      input: { ...VALID_SUSPENSION, permissions: p.value },
      expected: 'FAIL',
      field: Array.isArray(p.value) ? 'permissions.0' : 'permissions',
    })),

    ...HOSTILE_STRINGS.map((p): LayerFixture => ({
      name: `expires_at ← ${p.category}: ${p.label}`,
      input: { ...VALID_SUSPENSION, expires_at: p.value },
      expected: 'FAIL',
      field: 'expires_at',
    })),
    ...OPERATOR_INJECTION_PAYLOADS.map((p): LayerFixture => ({
      name: `expires_at ← ${p.category}: ${p.label}`,
      input: { ...VALID_SUSPENSION, expires_at: p.value },
      expected: 'FAIL',
      field: 'expires_at',
    })),
    { name: 'expires_at ← valid date with SQL tail', input: { ...VALID_SUSPENSION, expires_at: `${VALID_EXPIRY}' OR '1'='1` }, expected: 'FAIL', field: 'expires_at' },
    // The field trims, so it is treated as sanitised: control characters must not get
    // through. A reason can run over several lines, so line breaks are the exception.
    ...CONTROL_CHAR_PAYLOADS.filter((p) => !(p.label === 'CRLF injection')).map((p): LayerFixture => ({
      name: `reason ← ${p.category}: ${p.label}`,
      input: { ...VALID_SUSPENSION, reason: `${REASON_PREFIX} ${p.value as string}` },
      expected: 'FAIL',
      field: 'reason',
    })),
    ...OPERATOR_INJECTION_PAYLOADS.map((p): LayerFixture => ({
      name: `reason ← ${p.category}: ${p.label}`,
      input: { ...VALID_SUSPENSION, reason: p.value },
      expected: 'FAIL',
      field: 'reason',
    })),

    ...MASS_ASSIGNMENT_KEYS.map((extra): LayerFixture => ({
      name: `mass assignment: ${Object.keys(extra).join(', ')}`,
      input: { ...VALID_SUSPENSION, ...extra },
      expected: 'FAIL',
    })),
    // The issuer is always the caller, and a new suspension always starts live.
    { name: 'mass assignment: issued_by_user_id', input: { ...VALID_SUSPENSION, issued_by_user_id: VALID_USER_ID }, expected: 'FAIL' },
    { name: 'mass assignment: suspension_id', input: { ...VALID_SUSPENSION, suspension_id: VALID_USER_ID }, expected: 'FAIL' },
    { name: 'mass assignment: issued_at', input: { ...VALID_SUSPENSION, issued_at: VALID_EXPIRY }, expected: 'FAIL' },
    { name: 'mass assignment: lifted_at', input: { ...VALID_SUSPENSION, lifted_at: VALID_EXPIRY }, expected: 'FAIL' },
    { name: 'mass assignment: active', input: { ...VALID_SUSPENSION, active: false }, expected: 'FAIL' },
  ];

  describe('access control site · suspend — security', () => {
    const ctx = useAccessControlApp();

    describe('POST /api/v1/access-control/users/:id/suspensions', () => {
      describe('id', () => describeUserIdTable(ctx, userIdFixtures));
      describe('body', () => describeSuspensionTable(ctx, bodyFixtures));

      asCase('invalid', 'Attacker adds a role_type field to the body', 'Rejected and reported as unrecognized_keys').it('mass assignment is reported as unrecognized_keys', async () => {
        const outcome = await runSchemaLayer(SuspendActionsSchema, { ...VALID_SUSPENSION, active: false });
        expect(outcome.issues).toEqual(
          expect.arrayContaining([expect.objectContaining({ code: 'unrecognized_keys' })]),
        );
      });

      asCase('invalid', 'Attacker sends a __proto__ / constructor.prototype body', 'Request rejected (400); Object.prototype is not polluted').it.each(PROTOTYPE_POLLUTION_BODIES)('FAIL · prototype pollution: $label', async (p) => {
        const outcome = await runApiLayer(ctx.app, {
          method: 'post',
          path: suspendPath(),
          rawBody: withPollution(VALID_SUSPENSION, p.value as string),
        });
        expect(outcome.verdict).toBe('FAIL');
        expectValidationEnvelope(outcome);
        expect(ctx.service.suspendActions).not.toHaveBeenCalled();
        expect(({} as any).isAdmin).toBeUndefined();
      });
    });
  });
}
