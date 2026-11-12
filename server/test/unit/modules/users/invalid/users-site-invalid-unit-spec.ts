import { asCase } from '../../../../config/test-case';
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
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
  BLOCK_IP_ENDPOINT,
  CHECK_EMAIL_ENDPOINT,
  CREATE_ENDPOINT,
  REISSUE_ENDPOINT,
  useUsersApp,
  VALID_BLOCK,
  VALID_CHECK,
  VALID_GENERATE,
  VALID_MANUAL,
  VALID_REISSUE,
  VALID_USER_ID,
  describeBodyTable,
  describeUserIdTable,
} from '../users-site-support';
import { PermissionKey } from '../../../../../src/infastructures/prisma/common/client';
import { UsersSiteService } from '../../../../../src/modules/users/services/users-site-service';
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
 * Users Module · Master — Accounts — invalid inputs.
 *
 * Every case here is an intentionally wrong input. A case Passes when the system
 * refuses it exactly as stated — a rejection as expected is the correct result.
 * The valid cases for this unit live in ../valid/.
 */

/* ── error handling ──────────────────────────────────────────────────────── */
{
  /**
   * Master (Manage Users) — error handling: unexpected service errors are masked as
   * a generic 500 with nothing leaked, and the service's deliberate HttpExceptions
   * keep their status and message through the envelope.
   */
  const ENDPOINTS = [
    { title: 'POST /api/v1/users (create account)', endpoint: CREATE_ENDPOINT },
    { title: 'POST /api/v1/users/check-email', endpoint: CHECK_EMAIL_ENDPOINT },
    { title: 'POST /api/v1/users/:id/reissue-credentials', endpoint: REISSUE_ENDPOINT },
    { title: 'POST /api/v1/users/:id/block-ip', endpoint: BLOCK_IP_ENDPOINT },
  ];

  const DELIBERATE_ERRORS: { title: string; endpoint: (typeof ENDPOINTS)[number]['endpoint']; error: HttpException }[] = [
    {
      title: 'create account · 403 for a role the caller cannot create',
      endpoint: CREATE_ENDPOINT,
      error: new ForbiddenException('You cannot create an account with that role'),
    },
    {
      title: 'create account · 400 when the recipient cannot receive mail',
      endpoint: CREATE_ENDPOINT,
      error: new BadRequestException('An account already uses that email address'),
    },
    {
      title: 'reissue · 400 for the caller’s own account',
      endpoint: REISSUE_ENDPOINT,
      error: new BadRequestException('You cannot re-issue credentials for your own account'),
    },
    {
      title: 'reissue · 404 when the user has no sign-in account',
      endpoint: REISSUE_ENDPOINT,
      error: new NotFoundException('This user has no sign-in account'),
    },
    {
      title: 'block ip · 400 when there is no address to block',
      endpoint: BLOCK_IP_ENDPOINT,
      error: new BadRequestException('No IP address to block — this account has no recorded sign-in'),
    },
  ];

  describe('users site · master — error handling', () => {
    const ctx = useUsersApp();

    describe.each(ENDPOINTS)('$title', ({ endpoint }) => {
      asCase('invalid', 'The service fails with an unexpected internal or database error').it('masks an unexpected service error as a 500 without leaking detail', async () => {
        ctx.service[endpoint.method].mockRejectedValueOnce(new Error('syntax error at or near "OR"') as never);
        const outcome = await runApiLayer(ctx.app, { method: 'post', path: endpoint.path(), body: endpoint.valid });
        expect(outcome.status).toBe(500);
        expectSafeErrorEnvelope(outcome);
        expect(outcome.body).toEqual({ ok: false, message: 'Internal server error' });
      });
    });

    asCase('invalid', 'The service refuses the request with a deliberate HTTP error (each kind)', 'Each deliberate error keeps its status and message in the { ok: false } envelope').it.each(DELIBERATE_ERRORS)('keeps $title', async ({ endpoint, error }) => {
      ctx.service[endpoint.method].mockRejectedValueOnce(error as never);
      const outcome = await runApiLayer(ctx.app, { method: 'post', path: endpoint.path(), body: endpoint.valid });
      expect(outcome.status).toBe(error.getStatus());
      expectSafeErrorEnvelope(outcome);
      expect(outcome.body.message).toBe(error.message);
    });
  });
}

/* ── input validation ────────────────────────────────────────────────────── */
{
  /**
   * Master (Manage Users) — input validation: required fields, enums, length and
   * lifetime boundaries, the manual-mode email rule, and legitimate inputs that
   * must still pass.
   */
  const ALL_PERMISSIONS = Object.values(PermissionKey);

  /** 160 characters exactly, or one over. */
  const emailOfLength = (length: number) => `${'a'.repeat(length - '@cares.ph'.length)}@cares.ph`;

  const emailFormatFixtures = (field: 'email' | 'recipient_email', valid: object): LayerFixture[] => [
    { name: `${field} empty`, input: { ...valid, [field]: '' }, expected: 'FAIL', field },
    { name: `${field} without domain`, input: { ...valid, [field]: 'staff@' }, expected: 'FAIL', field },
    { name: `${field} without @`, input: { ...valid, [field]: 'staff.cares.ph' }, expected: 'FAIL', field },
    { name: `${field} padded`, input: { ...valid, [field]: ' staff@cares.ph ' }, expected: 'FAIL', field },
    { name: `${field} over max`, input: { ...valid, [field]: emailOfLength(161) }, expected: 'FAIL', field },
  ];

  /** Same rule on Create account and Reissue credentials: 1 hour to 90 days, default 72. */
  const lifetimeFixtures = (valid: Record<string, unknown>): LayerFixture[] => {
    const field = 'expires_in_hours';
    return [
      { name: 'expires_in_hours zero', input: { ...valid, [field]: 0 }, expected: 'FAIL', field },
      { name: 'expires_in_hours negative', input: { ...valid, [field]: -1 }, expected: 'FAIL', field },
      { name: 'expires_in_hours over max', input: { ...valid, [field]: 2161 }, expected: 'FAIL', field },
      { name: 'expires_in_hours fractional', input: { ...valid, [field]: 1.5 }, expected: 'FAIL', field },
    ];
  };

  const createFixtures: LayerFixture[] = [

    // mode
    { name: 'mode missing', input: { ...VALID_GENERATE, mode: undefined }, expected: 'FAIL', field: 'mode' },
    { name: 'mode unknown', input: { ...VALID_GENERATE, mode: 'import' }, expected: 'FAIL', field: 'mode' },
    { name: 'mode wrong case', input: { ...VALID_GENERATE, mode: 'GENERATE' }, expected: 'FAIL', field: 'mode' },

    // email: required only when entered manually
    { name: 'manual mode without email', input: { ...VALID_MANUAL, email: undefined }, expected: 'FAIL', field: 'email' },
    ...emailFormatFixtures('email', VALID_MANUAL),

    // recipient_email
    { name: 'recipient_email missing', input: { ...VALID_GENERATE, recipient_email: undefined }, expected: 'FAIL', field: 'recipient_email' },
    ...emailFormatFixtures('recipient_email', VALID_GENERATE),

    // role_type: a portal role, or an app role (volunteer / donor / beneficiary)
    { name: 'role_type missing', input: { ...VALID_GENERATE, role_type: undefined }, expected: 'FAIL', field: 'role_type' },
    { name: 'role_type not a role', input: { ...VALID_GENERATE, role_type: 'SUPERADMIN' }, expected: 'FAIL', field: 'role_type' },
    { name: 'role_type wrong case', input: { ...VALID_GENERATE, role_type: 'admin' }, expected: 'FAIL', field: 'role_type' },
    { name: 'role_type app role in wrong case', input: { ...VALID_GENERATE, role_type: 'volunteer', volunteer_type: 'STUDENT' }, expected: 'FAIL', field: 'role_type' },

    // volunteer_type: required for a volunteer, refused on every other role
    { name: 'volunteer without volunteer_type', input: { ...VALID_GENERATE, role_type: 'VOLUNTEER' }, expected: 'FAIL', field: 'volunteer_type' },
    { name: 'volunteer_type unknown', input: { ...VALID_GENERATE, role_type: 'VOLUNTEER', volunteer_type: 'FACULTY' }, expected: 'FAIL', field: 'volunteer_type' },
    { name: 'volunteer_type wrong case', input: { ...VALID_GENERATE, role_type: 'VOLUNTEER', volunteer_type: 'student' }, expected: 'FAIL', field: 'volunteer_type' },
    { name: 'volunteer_type on a portal role', input: { ...VALID_GENERATE, volunteer_type: 'STUDENT' }, expected: 'FAIL', field: 'volunteer_type' },
    { name: 'volunteer_type on a donor', input: { ...VALID_GENERATE, role_type: 'DONOR', volunteer_type: 'STAFF' }, expected: 'FAIL', field: 'volunteer_type' },

    // An app account holds no portal rights, so a scope on one is refused.
    { name: 'permissions on a volunteer', input: { ...VALID_GENERATE, role_type: 'VOLUNTEER', volunteer_type: 'STUDENT', permissions: [] }, expected: 'FAIL', field: 'permissions' },
    { name: 'permissions on a beneficiary', input: { ...VALID_GENERATE, role_type: 'BENEFICIARY', permissions: ALL_PERMISSIONS.slice(0, 1) }, expected: 'FAIL', field: 'permissions' },

    { name: 'department not on the list', input: { ...VALID_GENERATE, department: 'College of Astronomy' }, expected: 'FAIL', field: 'department' },
    { name: 'department wrong case', input: { ...VALID_GENERATE, department: 'college of nursing' }, expected: 'FAIL', field: 'department' },
    { name: 'department empty', input: { ...VALID_GENERATE, department: '' }, expected: 'FAIL', field: 'department' },
    { name: 'permissions over max', input: { ...VALID_GENERATE, permissions: [...ALL_PERMISSIONS, ALL_PERMISSIONS[0]] }, expected: 'FAIL', field: 'permissions' },
    { name: 'permissions unknown key', input: { ...VALID_GENERATE, permissions: ['ALL'] }, expected: 'FAIL', field: 'permissions.0' },

    ...lifetimeFixtures(VALID_GENERATE),
  ];

  // Loose on purpose: a malformed address is answered as `valid: false` by the service
  // so the form can show it inline, so only an absent or oversized value is a 400.
  const checkEmailFixtures: LayerFixture[] = [
    { name: 'email missing', input: {}, expected: 'FAIL', field: 'email' },
    { name: 'email empty', input: { email: '' }, expected: 'FAIL', field: 'email', message: 'An email address is required' },
    { name: 'email whitespace-only', input: { email: '   ' }, expected: 'FAIL', field: 'email', message: 'An email address is required' },
    { name: 'email over max', input: { email: 'a'.repeat(161) }, expected: 'FAIL', field: 'email' },
  ];

  const reissueFixtures: LayerFixture[] = [
    ...lifetimeFixtures(VALID_REISSUE),
  ];

  const blockFixtures: LayerFixture[] = [
    { name: 'ip_address empty', input: { ip_address: '' }, expected: 'FAIL', field: 'ip_address' },
    { name: 'ip_address octet out of range', input: { ip_address: '256.1.1.1' }, expected: 'FAIL', field: 'ip_address' },
    { name: 'ip_address too few octets', input: { ip_address: '10.0.1' }, expected: 'FAIL', field: 'ip_address' },
    { name: 'ip_address CIDR range', input: { ip_address: '10.0.0.0/8' }, expected: 'FAIL', field: 'ip_address' },
    { name: 'ip_address hostname', input: { ip_address: 'localhost' }, expected: 'FAIL', field: 'ip_address' },
    { name: 'ip_address padded', input: { ip_address: ' 203.0.113.10 ' }, expected: 'FAIL', field: 'ip_address' },
    { name: 'reason over max', input: { reason: 'a'.repeat(501) }, expected: 'FAIL', field: 'reason' },
  ];

  const userIdFixtures: LayerFixture<string>[] = [
    { name: 'not a uuid', input: 'user-1', expected: 'FAIL' },
    { name: 'uuid missing a character', input: VALID_USER_ID.slice(0, -1), expected: 'FAIL' },
    { name: 'uuid without hyphens', input: VALID_USER_ID.replace(/-/g, ''), expected: 'FAIL' },
    { name: 'uuid with surrounding spaces', input: ` ${VALID_USER_ID} `, expected: 'FAIL' },
    { name: 'numeric id', input: '42', expected: 'FAIL' },
  ];

  describe('users site · master — input validation', () => {
    const ctx = useUsersApp();

    describe('POST /api/v1/users (create account)', () => {
      describeBodyTable(ctx, CREATE_ENDPOINT, createFixtures);
    });

    describe('POST /api/v1/users/check-email', () => {
      describeBodyTable(ctx, CHECK_EMAIL_ENDPOINT, checkEmailFixtures);
    });

    describe('POST /api/v1/users/:id/reissue-credentials', () => {
      describe('id', () => describeUserIdTable(ctx, REISSUE_ENDPOINT, userIdFixtures));
      describe('body', () => describeBodyTable(ctx, REISSUE_ENDPOINT, reissueFixtures));
    });

    describe('POST /api/v1/users/:id/block-ip', () => {
      describe('id', () => describeUserIdTable(ctx, BLOCK_IP_ENDPOINT, userIdFixtures));
      describe('body', () => describeBodyTable(ctx, BLOCK_IP_ENDPOINT, blockFixtures));
    });
  });
}

/* ── security ────────────────────────────────────────────────────────────── */
{
  /**
   * Master (Manage Users) — security, per field class:
   *   mode, role_type, permissions, email, recipient_email, ip_address, ids
   *                       constrained: every hostile string FAILs
   *   department          short label: SQLi, special-char series, control chars, XSS FAIL
   *   expires_in_hours    number: strings, booleans and arrays FAIL
   *   reason              free text, trimmed: control characters FAIL, line breaks stay
   *   check-email email   loose by design: hostile strings PASS the schema and the real
   *                       service answers `valid: false` (asserted below)
   * plus type confusion, mass assignment and prototype pollution on every body.
   */
  const rejectAll = (
    field: string,
    valid: object,
    wrap: (value: unknown) => unknown = (value) => value,
    issuePath: string = field,
  ): LayerFixture[] =>
    HOSTILE_STRINGS.map((p) => ({
      name: `${field} ← ${p.category}: ${p.label}`,
      input: { ...valid, [field]: wrap(p.value) },
      expected: 'FAIL',
      field: issuePath,
    }));

  const typeConfusion = (field: string, valid: object): LayerFixture[] =>
    OPERATOR_INJECTION_PAYLOADS.map((p) => ({
      name: `${field} ← ${p.category}: ${p.label}`,
      input: { ...valid, [field]: p.value },
      expected: 'FAIL',
      field,
    }));

  const massAssignment = (valid: object, keys: Record<string, unknown>[]): LayerFixture[] =>
    keys.map((extra) => ({
      name: `mass assignment: ${Object.keys(extra).join(', ')}`,
      input: { ...valid, ...extra },
      expected: 'FAIL',
    }));

  /** A number field: only a real number in range may pass. */
  const lifetimeFixtures = (valid: object): LayerFixture[] => {
    const field = 'expires_in_hours';
    return [
      ...rejectAll(field, valid),
      ...OPERATOR_INJECTION_PAYLOADS.filter((p) => !(typeof p.value === 'number')).map((p): LayerFixture =>
        // The catalogue's "number instead of string" is 1, a valid lifetime here.
        ({ name: `${field} ← ${p.category}: ${p.label}`, input: { ...valid, [field]: p.value }, expected: 'FAIL', field }),
      ),
      { name: `${field} ← array holding a number`, input: { ...valid, [field]: [5] }, expected: 'FAIL', field },
      { name: `${field} ← hex string`, input: { ...valid, [field]: '0x10' }, expected: 'FAIL', field },
    ];
  };

  const createFixtures: LayerFixture[] = [
    ...rejectAll('mode', VALID_GENERATE),
    ...typeConfusion('mode', VALID_GENERATE),

    ...rejectAll('email', VALID_MANUAL),
    ...typeConfusion('email', VALID_MANUAL),

    ...rejectAll('recipient_email', VALID_GENERATE),
    ...typeConfusion('recipient_email', VALID_GENERATE),

    ...rejectAll('role_type', VALID_GENERATE),
    ...typeConfusion('role_type', VALID_GENERATE),

    ...[...SQL_INJECTION_PAYLOADS, ...specialCharacterSeries(), ...CONTROL_CHAR_PAYLOADS, ...XSS_PAYLOADS].map(
      (p): LayerFixture => ({
        name: `department ← ${p.category}: ${p.label}`,
        input: { ...VALID_GENERATE, department: p.value },
        expected: 'FAIL',
        field: 'department',
      }),
    ),
    ...typeConfusion('department', VALID_GENERATE),

    ...rejectAll('permissions', VALID_GENERATE, (value) => [value], 'permissions.0'),
    ...OPERATOR_INJECTION_PAYLOADS.map((p): LayerFixture => ({
      name: `permissions ← ${p.category}: ${p.label}`,
      input: { ...VALID_GENERATE, permissions: p.value },
      expected: 'FAIL',
      field: Array.isArray(p.value) ? 'permissions.0' : 'permissions',
    })),

    ...lifetimeFixtures(VALID_GENERATE),

    // role_type is a real field on this body, so the catalogue's role_type key is not extra.
    ...massAssignment(VALID_GENERATE, MASS_ASSIGNMENT_KEYS.filter((extra) => !('role_type' in extra))),
    // The password is always generated: an administrator must not be able to choose it.
    ...massAssignment(VALID_GENERATE, [
      { password: 'Chosen!Passw0rd' },
      { password_hash: '$2b$10$abcdefghijklmnopqrstuv' },
      { provisioned_by_user_id: VALID_USER_ID },
      { credential_expires_at: '2099-01-01T00:00:00.000Z' },
    ]),
  ];

  const checkEmailFixtures: LayerFixture[] = [
    ...typeConfusion('email', VALID_CHECK),
    ...massAssignment(VALID_CHECK, MASS_ASSIGNMENT_KEYS),
  ];

  const reissueFixtures: LayerFixture[] = [
    ...lifetimeFixtures(VALID_REISSUE),
    ...massAssignment(VALID_REISSUE, MASS_ASSIGNMENT_KEYS),
    // The password is always generated, and the account comes only from the path.
    ...massAssignment(VALID_REISSUE, [{ password: 'Chosen!Passw0rd' }, { email: 'other@cares.ph' }]),
  ];

  const blockFixtures: LayerFixture[] = [
    ...rejectAll('ip_address', VALID_BLOCK),
    ...typeConfusion('ip_address', VALID_BLOCK),
    // The field trims, so it is treated as sanitised: control characters must not get
    // through. A reason can run over several lines, so line breaks are the exception.
    ...CONTROL_CHAR_PAYLOADS.filter((p) => !(p.label === 'CRLF injection')).map((p): LayerFixture => ({
      name: `reason ← ${p.category}: ${p.label}`,
      input: { ...VALID_BLOCK, reason: p.value },
      expected: 'FAIL',
      field: 'reason',
    })),
    ...typeConfusion('reason', VALID_BLOCK),

    ...massAssignment(VALID_BLOCK, MASS_ASSIGNMENT_KEYS),
    // The blocker is always the caller.
    ...massAssignment(VALID_BLOCK, [{ blocked_by_user_id: VALID_USER_ID }]),
  ];

  const userIdFixtures: LayerFixture<string>[] = [
    ...HOSTILE_STRINGS.map((p): LayerFixture<string> => ({
      name: `id ← ${p.category}: ${p.label}`,
      input: p.value as string,
      expected: 'FAIL',
    })),
    { name: 'id ← uuid with SQL tail', input: `${VALID_USER_ID}' OR '1'='1`, expected: 'FAIL' },
    { name: 'id ← uuid with stacked query', input: `${VALID_USER_ID}; DROP TABLE "User"`, expected: 'FAIL' },
  ];

  describe('users site · master — security', () => {
    const ctx = useUsersApp();

    describe.each([
      { title: 'POST /api/v1/users (create account)', endpoint: CREATE_ENDPOINT, fixtures: createFixtures },
      { title: 'POST /api/v1/users/check-email', endpoint: CHECK_EMAIL_ENDPOINT, fixtures: checkEmailFixtures },
    ])('$title', ({ endpoint, fixtures }) => {
      describeBodyTable(ctx, endpoint, fixtures);
    });

    describe('POST /api/v1/users/:id/reissue-credentials', () => {
      describe('id', () => describeUserIdTable(ctx, REISSUE_ENDPOINT, userIdFixtures));
      describe('body', () => describeBodyTable(ctx, REISSUE_ENDPOINT, reissueFixtures));
    });

    describe('POST /api/v1/users/:id/block-ip', () => {
      describe('id', () => describeUserIdTable(ctx, BLOCK_IP_ENDPOINT, userIdFixtures));
      describe('body', () => describeBodyTable(ctx, BLOCK_IP_ENDPOINT, blockFixtures));
    });

    describe.each([
      { title: 'create account', endpoint: CREATE_ENDPOINT },
      { title: 'check email', endpoint: CHECK_EMAIL_ENDPOINT },
      { title: 'reissue credentials', endpoint: REISSUE_ENDPOINT },
      { title: 'block ip', endpoint: BLOCK_IP_ENDPOINT },
    ])('$title — every body', ({ endpoint }) => {
      asCase('invalid', 'Attacker adds a role_type field to the body', 'Rejected and reported as unrecognized_keys').it('mass assignment is reported as unrecognized_keys', async () => {
        const outcome = await runSchemaLayer(endpoint.schema, { ...endpoint.valid, is_protected: true });
        expect(outcome.issues).toEqual(
          expect.arrayContaining([expect.objectContaining({ code: 'unrecognized_keys' })]),
        );
      });

      asCase('invalid', 'Attacker sends a __proto__ / constructor.prototype body', 'Request rejected (400); Object.prototype is not polluted').it.each(PROTOTYPE_POLLUTION_BODIES)('FAIL · prototype pollution: $label', async (p) => {
        const outcome = await runApiLayer(ctx.app, {
          method: 'post',
          path: endpoint.path(),
          rawBody: withPollution(endpoint.valid, p.value as string),
        });
        expect(outcome.verdict).toBe('FAIL');
        expectValidationEnvelope(outcome);
        expect(ctx.service[endpoint.method]).not.toHaveBeenCalled();
        expect(({} as any).isAdmin).toBeUndefined();
      });
    });

    // The schema lets these through on purpose, so the real method has to stop them:
    // no DNS lookup, and no query against the account table.
    describe('checkRecipientEmail (real service)', () => {
      asCase('invalid', 'Attacker enters hostile strings as the email to check', 'Answers valid: false; nothing is looked up as SQL').it.each(HOSTILE_STRINGS)('answers valid: false · $category: $label', async (p) => {
        const repository = autoMock<{ findAccountByEmail: () => unknown }>();
        const service = new (UsersSiteService as any)(repository) as UsersSiteService;

        const result = await service.checkRecipientEmail(p.value as string);

        expect(result.valid).toBe(false);
        expect(result.reason).toEqual(expect.any(String));
        expect(repository.findAccountByEmail).not.toHaveBeenCalled();
      });
    });
  });
}
