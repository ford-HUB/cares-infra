import { asCase } from '../../../../config/test-case';
import { PermissionKey, RoleType } from '../../../../../src/infastructures/prisma/common/client';
import { LayerFixture, runApiLayer } from '../../../../config/layer-harness';
import {
  BLOCKED_USER_RESPONSE,
  BLOCK_IP_ENDPOINT,
  CHECK_EMAIL_ENDPOINT,
  CREATE_ENDPOINT,
  EMAIL_CHECK_RESPONSE,
  PROVISIONED_RESPONSE,
  REISSUE_ENDPOINT,
  VALID_BLOCK,
  VALID_CHECK,
  VALID_GENERATE,
  VALID_MANUAL,
  VALID_REISSUE,
  VALID_USER_ID,
  describeBodyTable,
  describeUserIdTable,
  useUsersApp,
  CALLER,
} from '../users-site-support';
import {
  CONTROL_CHAR_PAYLOADS,
  HOSTILE_STRINGS,
  OPERATOR_INJECTION_PAYLOADS,
  PATH_TRAVERSAL_PAYLOADS,
  SQL_INJECTION_PAYLOADS,
  UNICODE_CONFUSABLE_PAYLOADS,
  XSS_PAYLOADS,
  specialCharacterSeries,
} from '../../../../config/security-payloads';

/**
 * Users Module · Master — Accounts — valid inputs.
 *
 * Every case here is a legitimate input the system must accept.
 * The invalid cases for this unit live in ../invalid/.
 */

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
    { name: `${field} at max`, input: { ...valid, [field]: emailOfLength(160) }, expected: 'PASS' },
    { name: `${field} with a legit apostrophe`, input: { ...valid, [field]: "o'neil@cares.ph" }, expected: 'PASS' },
  ];

  /** Same rule on Create account and Reissue credentials: 1 hour to 90 days, default 72. */
  const lifetimeFixtures = (valid: Record<string, unknown>): LayerFixture[] => {
    const { expires_in_hours: _omitted, ...withoutLifetime } = valid;
    const field = 'expires_in_hours';
    return [
      { name: 'expires_in_hours missing (defaults)', input: withoutLifetime, expected: 'PASS' },
      { name: 'expires_in_hours at min', input: { ...valid, [field]: 1 }, expected: 'PASS' },
      { name: 'expires_in_hours at max', input: { ...valid, [field]: 2160 }, expected: 'PASS' },
    ];
  };

  const createFixtures: LayerFixture[] = [
    { name: 'generate mode, minimal body', input: VALID_GENERATE, expected: 'PASS' },
    { name: 'manual mode, minimal body', input: VALID_MANUAL, expected: 'PASS' },
    {
      name: 'every optional field',
      input: { ...VALID_MANUAL, department: 'College of Computer Studies', permissions: ALL_PERMISSIONS.slice(0, 2) },
      expected: 'PASS',
    },
    { name: 'generate mode with an email', input: { ...VALID_GENERATE, email: 'requester@cares.ph' }, expected: 'PASS' },
    ...emailFormatFixtures('email', VALID_MANUAL),
    ...emailFormatFixtures('recipient_email', VALID_GENERATE),
    { name: 'role_type ADMIN', input: { ...VALID_GENERATE, role_type: RoleType.ADMIN }, expected: 'PASS' },
    { name: 'role_type DIRECTOR', input: { ...VALID_GENERATE, role_type: RoleType.DIRECTOR }, expected: 'PASS' },
    { name: 'role_type COORDINATOR', input: { ...VALID_GENERATE, role_type: RoleType.COORDINATOR }, expected: 'PASS' },
    // Regular User accounts: app roles, which the portal sign-in refuses.
    { name: 'role_type VOLUNTEER as a student', input: { ...VALID_GENERATE, role_type: RoleType.VOLUNTEER, volunteer_type: 'STUDENT' }, expected: 'PASS' },
    { name: 'role_type VOLUNTEER as staff', input: { ...VALID_GENERATE, role_type: RoleType.VOLUNTEER, volunteer_type: 'STAFF' }, expected: 'PASS' },
    { name: 'role_type VOLUNTEER as alumni', input: { ...VALID_GENERATE, role_type: RoleType.VOLUNTEER, volunteer_type: 'ALUMNI' }, expected: 'PASS' },
    { name: 'role_type VOLUNTEER with a department', input: { ...VALID_GENERATE, role_type: RoleType.VOLUNTEER, volunteer_type: 'STUDENT', department: 'College of Computer Studies' }, expected: 'PASS' },
    { name: 'role_type DONOR', input: { ...VALID_GENERATE, role_type: RoleType.DONOR }, expected: 'PASS' },
    { name: 'role_type BENEFICIARY', input: { ...VALID_GENERATE, role_type: RoleType.BENEFICIARY }, expected: 'PASS' },

    // department: one of the fixed names, some with parentheses and hyphens
    { name: 'department with parentheses', input: { ...VALID_GENERATE, department: 'Basic Education (Junior High School)' }, expected: 'PASS' },
    { name: 'department with a hyphen', input: { ...VALID_GENERATE, department: 'Non-Teaching Personnel' }, expected: 'PASS' },

    // permissions
    { name: 'permissions empty', input: { ...VALID_GENERATE, permissions: [] }, expected: 'PASS' },
    { name: 'permissions all keys', input: { ...VALID_GENERATE, permissions: ALL_PERMISSIONS }, expected: 'PASS' },

    ...lifetimeFixtures(VALID_GENERATE),
  ];

  // Loose on purpose: a malformed address is answered as `valid: false` by the service
  // so the form can show it inline, so only an absent or oversized value is a 400.
  const checkEmailFixtures: LayerFixture[] = [
    { name: 'valid email', input: VALID_CHECK, expected: 'PASS' },
    { name: 'malformed email', input: { email: 'not-an-email' }, expected: 'PASS' },
    { name: 'email at max', input: { email: 'a'.repeat(160) }, expected: 'PASS' },
    { name: 'email at max once trimmed', input: { email: `  ${'a'.repeat(160)}  ` }, expected: 'PASS' },
  ];

  const reissueFixtures: LayerFixture[] = [
    { name: 'valid body', input: VALID_REISSUE, expected: 'PASS' },
    ...lifetimeFixtures(VALID_REISSUE),
  ];

  const blockFixtures: LayerFixture[] = [
    { name: 'every field', input: VALID_BLOCK, expected: 'PASS' },
    // No address means "block the account's last sign-in IP"; the service resolves it.
    { name: 'empty body', input: {}, expected: 'PASS' },
    { name: 'reason only', input: { reason: VALID_BLOCK.reason }, expected: 'PASS' },

    // ip_address
    { name: 'ip_address only', input: { ip_address: VALID_BLOCK.ip_address }, expected: 'PASS' },
    { name: 'ip_address IPv6', input: { ip_address: '2001:db8::8a2e:370:7334' }, expected: 'PASS' },
    { name: 'ip_address compressed IPv6', input: { ip_address: '::1' }, expected: 'PASS' },

    // reason
    { name: 'reason empty', input: { reason: '' }, expected: 'PASS' },
    { name: 'reason at max', input: { reason: 'a'.repeat(500) }, expected: 'PASS' },
    { name: 'reason at max once trimmed', input: { reason: `  ${'a'.repeat(500)}  ` }, expected: 'PASS' },
    { name: 'reason with line breaks', input: { reason: 'First attempt\nSecond attempt' }, expected: 'PASS' },
  ];

  const userIdFixtures: LayerFixture<string>[] = [
    { name: 'valid uuid', input: VALID_USER_ID, expected: 'PASS' },
    { name: 'upper-case uuid', input: VALID_USER_ID.toUpperCase(), expected: 'PASS' },
  ];

  describe('users site · master — input validation', () => {
    const ctx = useUsersApp();

    describe('POST /api/v1/users (create account)', () => {
      describeBodyTable(ctx, CREATE_ENDPOINT, createFixtures);

      asCase('valid', 'Staff submits a valid request').it('returns the created account and its one-time credential', async () => {
        const outcome = await runApiLayer(ctx.app, { method: 'post', path: CREATE_ENDPOINT.path(), body: VALID_GENERATE });
        expect(outcome.status).toBe(201);
        expect(outcome.body).toEqual({ ok: true, message: 'Account created', data: PROVISIONED_RESPONSE });
      });
    });

    describe('POST /api/v1/users/check-email', () => {
      describeBodyTable(ctx, CHECK_EMAIL_ENDPOINT, checkEmailFixtures);

      asCase('valid', 'Staff checks whether an email is available').it('returns the check result, and is not routed as a user id', async () => {
        const outcome = await runApiLayer(ctx.app, { method: 'post', path: CHECK_EMAIL_ENDPOINT.path(), body: VALID_CHECK });
        expect(outcome.status).toBe(201);
        expect(outcome.body).toEqual({ ok: true, message: 'Email checked', data: EMAIL_CHECK_RESPONSE });
      });
    });

    describe('POST /api/v1/users/:id/reissue-credentials', () => {
      describe('id', () => describeUserIdTable(ctx, REISSUE_ENDPOINT, userIdFixtures));
      describe('body', () => describeBodyTable(ctx, REISSUE_ENDPOINT, reissueFixtures));

      asCase('valid', 'Staff submits a valid request').it('returns the new one-time credential', async () => {
        const outcome = await runApiLayer(ctx.app, { method: 'post', path: REISSUE_ENDPOINT.path(), body: VALID_REISSUE });
        expect(outcome.status).toBe(201);
        expect(outcome.body).toEqual({ ok: true, message: 'New credentials issued', data: PROVISIONED_RESPONSE });
      });
    });

    describe('POST /api/v1/users/:id/block-ip', () => {
      describe('id', () => describeUserIdTable(ctx, BLOCK_IP_ENDPOINT, userIdFixtures));
      describe('body', () => describeBodyTable(ctx, BLOCK_IP_ENDPOINT, blockFixtures));

      asCase('valid', 'Staff submits a valid request').it('returns the updated user', async () => {
        const outcome = await runApiLayer(ctx.app, { method: 'post', path: BLOCK_IP_ENDPOINT.path(), body: VALID_BLOCK });
        expect(outcome.status).toBe(201);
        expect(outcome.body).toEqual({ ok: true, message: 'IP address blocked', data: BLOCKED_USER_RESPONSE });
      });
    });
  });
}

/* ── normalization ───────────────────────────────────────────────────────── */
{
  /**
   * Master (Manage Users) — normalisation: what each POST hands the service after
   * the schema has trimmed and defaulted, with the caller from the token and the
   * target account from the path.
   */
  const REQUEST_CONTEXT = expect.objectContaining({ ipAddress: expect.any(String) });

  describe('users site · master — normalisation', () => {
    const ctx = useUsersApp();

    describe('POST /api/v1/users (create account)', () => {
      asCase('valid', 'Staff enters the department with surrounding spaces').it('trims the department and passes the caller and request context', async () => {
        await runApiLayer(ctx.app, {
          method: 'post',
          path: CREATE_ENDPOINT.path(),
          body: { ...VALID_GENERATE, department: '  College of Nursing  ' },
        });
        expect(ctx.service.provisionUser).toHaveBeenCalledWith(
          CALLER,
          { ...VALID_GENERATE, department: 'College of Nursing' },
          REQUEST_CONTEXT,
        );
      });

      asCase('valid', 'Staff leaves the optional fields out').it('defaults the credential lifetime to 72 hours', async () => {
        const { expires_in_hours: _omitted, ...body } = VALID_GENERATE;
        await runApiLayer(ctx.app, { method: 'post', path: CREATE_ENDPOINT.path(), body });
        expect(ctx.service.provisionUser.mock.calls[0][1].expires_in_hours).toBe(72);
      });
    });

    describe('POST /api/v1/users/check-email', () => {
      // Lower-casing happens in the service, once it has decided the value is an address.
      asCase('valid', 'Staff enters an email address with surrounding spaces').it('trims the address and leaves its case alone', async () => {
        await runApiLayer(ctx.app, {
          method: 'post',
          path: CHECK_EMAIL_ENDPOINT.path(),
          body: { email: '  New.Staff@Cares.PH  ' },
        });
        expect(ctx.service.checkRecipientEmail).toHaveBeenCalledWith('New.Staff@Cares.PH');
      });
    });

    describe('POST /api/v1/users/:id/reissue-credentials', () => {
      asCase('valid', 'Staff submits a valid request').it('passes the caller, the id from the path and the lifetime', async () => {
        await runApiLayer(ctx.app, { method: 'post', path: REISSUE_ENDPOINT.path(), body: { expires_in_hours: 24 } });
        expect(ctx.service.reissueCredentials).toHaveBeenCalledWith(
          CALLER,
          VALID_USER_ID,
          { expires_in_hours: 24 },
          REQUEST_CONTEXT,
        );
      });

      asCase('valid', 'Staff leaves the optional fields out').it('defaults the credential lifetime to 72 hours', async () => {
        await runApiLayer(ctx.app, { method: 'post', path: REISSUE_ENDPOINT.path(), body: {} });
        expect(ctx.service.reissueCredentials.mock.calls[0][2]).toEqual({ expires_in_hours: 72 });
      });
    });

    describe('POST /api/v1/users/:id/block-ip', () => {
      asCase('valid', 'Staff enters the reason with surrounding spaces').it('trims the reason and passes the caller and the id from the path', async () => {
        await runApiLayer(ctx.app, {
          method: 'post',
          path: BLOCK_IP_ENDPOINT.path(),
          body: { ...VALID_BLOCK, reason: `  ${VALID_BLOCK.reason}  ` },
        });
        expect(ctx.service.blockUserIp).toHaveBeenCalledWith(CALLER, VALID_USER_ID, VALID_BLOCK, REQUEST_CONTEXT);
      });

      asCase('valid', 'Staff leaves the optional fields out').it('adds no address of its own when none is given', async () => {
        await runApiLayer(ctx.app, { method: 'post', path: BLOCK_IP_ENDPOINT.path(), body: {} });
        expect(ctx.service.blockUserIp.mock.calls[0][2]).toEqual({});
      });
    });
  });
}

/* ── security ────────────────────────────────────────────────────────────── */
{
  /** A number field: only a real number in range may pass. */
  const lifetimeFixtures = (valid: object): LayerFixture[] => {
    const field = 'expires_in_hours';
    return [
      ...OPERATOR_INJECTION_PAYLOADS.filter((p) => typeof p.value === 'number').map((p): LayerFixture =>
        // The catalogue's "number instead of string" is 1, a valid lifetime here.
        ({ name: `${field} ← a real number`, input: { ...valid, [field]: p.value }, expected: 'PASS' }),
      ),
    ];
  };

  const createFixtures: LayerFixture[] = [

    ...lifetimeFixtures(VALID_GENERATE),
  ];

  const checkEmailFixtures: LayerFixture[] = [
    ...HOSTILE_STRINGS.map((p): LayerFixture => ({
      name: `email ← ${p.category}: ${p.label}`,
      input: { email: p.value },
      expected: 'PASS',
    })),
  ];

  const reissueFixtures: LayerFixture[] = [
    ...lifetimeFixtures(VALID_REISSUE),
  ];

  const blockFixtures: LayerFixture[] = [

    // Free text: stored as data through Prisma and escaped by the portal when rendered.
    ...[...SQL_INJECTION_PAYLOADS, ...specialCharacterSeries(), ...UNICODE_CONFUSABLE_PAYLOADS, ...XSS_PAYLOADS, ...PATH_TRAVERSAL_PAYLOADS].map(
      (p): LayerFixture => ({
        name: `reason ← ${p.category}: ${p.label}`,
        input: { ...VALID_BLOCK, reason: p.value },
        expected: 'PASS',
      }),
    ),
    // The field trims, so it is treated as sanitised: control characters must not get
    // through. A reason can run over several lines, so line breaks are the exception.
    ...CONTROL_CHAR_PAYLOADS.filter((p) => p.label === 'CRLF injection').map((p): LayerFixture => ({
      name: `reason ← ${p.category}: ${p.label}`,
      input: { ...VALID_BLOCK, reason: p.value },
      expected: 'PASS',
      field: 'reason',
    })),
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
      describe('body', () => describeBodyTable(ctx, REISSUE_ENDPOINT, reissueFixtures));
    });

    describe('POST /api/v1/users/:id/block-ip', () => {
      describe('body', () => describeBodyTable(ctx, BLOCK_IP_ENDPOINT, blockFixtures));
    });

    describe.each([
      { title: 'create account', endpoint: CREATE_ENDPOINT },
      { title: 'check email', endpoint: CHECK_EMAIL_ENDPOINT },
      { title: 'reissue credentials', endpoint: REISSUE_ENDPOINT },
      { title: 'block ip', endpoint: BLOCK_IP_ENDPOINT },
    ])('$title — every body', ({ endpoint }) => {
    });
  });
}
