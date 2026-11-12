import { RoleType } from '../../../../../../src/infastructures/prisma/common/client';
import { DEFAULT_SECURITY_POLICY } from '../../../../../../src/modules/security-policy/services/security-policy-service';
import { expectSafeErrorEnvelope, runSchemaLayer } from '../../../../../config/layer-harness';
import {
  CONTROL_CHAR_PAYLOADS,
  HOSTILE_STRINGS,
  MASS_ASSIGNMENT_KEYS,
  OPERATOR_INJECTION_PAYLOADS,
  PATH_TRAVERSAL_PAYLOADS,
  PROTOTYPE_POLLUTION_BODIES,
  SQL_INJECTION_PAYLOADS,
  SecurityPayload,
  UNICODE_CONFUSABLE_PAYLOADS,
  XSS_PAYLOADS,
  specialCharacterSeries,
} from '../../../../../config/security-payloads';
import { defineCases } from '../../../../../config/test-case';
import {
  INVALID_CREDENTIALS,
  LOGIN,
  MODULE,
  NON_PORTAL_ROLES,
  PASSWORD_HASH,
  VALID_LOGIN,
  expectRefusal,
  post,
  rejectsByValidation,
  rejectsEachByValidation,
  rejectsPrototypePollution,
  storedAccount,
  useAuthSiteApp,
} from '../login-site-support';

/**
 * Login — invalid inputs. Every case is an intentionally wrong sign-in. The case
 * Passes when the portal refuses it exactly as stated (status, message, no token,
 * no session) — a wrong password being rejected is the expected result.
 */
const testCase = defineCases({ module: MODULE, unit: 'Login', kind: 'invalid', prefix: 'LOGIN' });

const HOSTILE_EMAIL_FAMILIES: [string, SecurityPayload[]][] = [
  ['SQL injection strings', SQL_INJECTION_PAYLOADS],
  ['special-character series', specialCharacterSeries()],
  ['control characters (null byte, CRLF, tab …)', CONTROL_CHAR_PAYLOADS],
  ['look-alike unicode characters', UNICODE_CONFUSABLE_PAYLOADS],
  ['XSS markup', XSS_PAYLOADS],
  ['path-traversal strings', PATH_TRAVERSAL_PAYLOADS],
];

describe('Login — invalid inputs', () => {
  const ctx = useAuthSiteApp();

  /** Refused by the service: no token signed, no session opened. */
  const expectNotSignedIn = async (input: unknown, status: number, message: string) => {
    const outcome = await post(ctx, LOGIN.path, input);
    expectRefusal(outcome, status, message);
    expectSafeErrorEnvelope(outcome);
    expect(ctx.jwt.sign).not.toHaveBeenCalled();
    expect(ctx.sessions.create).not.toHaveBeenCalled();
    return outcome;
  };

  /* ── empty and malformed fields (validation) ─────────────────────────── */

  testCase('Admin leaves the email field empty', 'Login fails with "Email is required" on email (400)', () =>
    rejectsByValidation(ctx, LOGIN, { ...VALID_LOGIN, email: '' }, 'email'),
  );
  testCase('Admin enters only spaces in the email field', 'Login fails with "Validation failed" on email (400)', () =>
    rejectsByValidation(ctx, LOGIN, { ...VALID_LOGIN, email: '    ' }, 'email'),
  );
  testCase('Request is sent without an email field', 'Login fails with "Email is required" on email (400)', () =>
    rejectsByValidation(ctx, LOGIN, { password: VALID_LOGIN.password }, 'email'),
  );
  testCase('Admin enters an email without a domain ("admin@")', 'Login fails with "Enter a valid email address" on email (400)', () =>
    rejectsByValidation(ctx, LOGIN, { ...VALID_LOGIN, email: 'admin@' }, 'email'),
  );
  testCase('Admin enters an email without "@" ("admin.cares.ph")', 'Login fails with "Enter a valid email address" on email (400)', () =>
    rejectsByValidation(ctx, LOGIN, { ...VALID_LOGIN, email: 'admin.cares.ph' }, 'email'),
  );
  testCase('Admin enters an email with spaces inside it', 'Login fails with "Validation failed" on email (400)', () =>
    rejectsByValidation(ctx, LOGIN, { ...VALID_LOGIN, email: 'ad min@cares.ph' }, 'email'),
  );
  testCase('Admin leaves the password field empty', 'Login fails with "Validation failed" on password (400)', () =>
    rejectsByValidation(ctx, LOGIN, { ...VALID_LOGIN, password: '' }, 'password'),
  );
  testCase('Request is sent without a password field', 'Login fails with "Validation failed" on password (400)', () =>
    rejectsByValidation(ctx, LOGIN, { email: VALID_LOGIN.email }, 'password'),
  );
  testCase('Admin submits the form with both fields empty', 'Login fails with "Email is required and Password is required" on email and "Password is required" on password (400)', () => {
    rejectsByValidation(ctx, LOGIN, { email: '', password: '' }, 'email');
    it('reports the password field as well', async () => {
      const outcome = await runSchemaLayer(LOGIN.schema, { email: '', password: '' });
      expect(outcome.issues.map((i) => i.path)).toEqual(expect.arrayContaining(['email', 'password']));
    });
  });

  /* ── wrong credentials (service) ─────────────────────────────────────── */

  testCase('Admin enters a correct email but a wrong password', `Login fails with "${INVALID_CREDENTIALS}" (401)`, () => {
    it('layer 2 — api refuses and records INVALID_CREDENTIALS', async () => {
      await expectNotSignedIn({ ...VALID_LOGIN, password: 'Wr0ng!Passw0rd' }, 401, INVALID_CREDENTIALS);
      expect(ctx.activity.record).toHaveBeenCalledWith(
        expect.objectContaining({ outcome: 'INVALID_CREDENTIALS', failureReason: 'Incorrect password' }),
      );
    });
  });
  testCase('Admin enters the correct password in the wrong letter case', `Login fails with "${INVALID_CREDENTIALS}" (401)`, () => {
    it('layer 2 — api refuses', async () => {
      await expectNotSignedIn({ ...VALID_LOGIN, password: VALID_LOGIN.password.toLowerCase() }, 401, INVALID_CREDENTIALS);
    });
  });
  testCase('Admin enters the correct password with a trailing space', `Login fails with "${INVALID_CREDENTIALS}" (401)`, () => {
    it('layer 2 — api refuses (passwords are not trimmed)', async () => {
      await expectNotSignedIn({ ...VALID_LOGIN, password: `${VALID_LOGIN.password} ` }, 401, INVALID_CREDENTIALS);
    });
  });
  testCase('Admin enters the password missing its last character', `Login fails with "${INVALID_CREDENTIALS}" (401)`, () => {
    it('layer 2 — api refuses', async () => {
      await expectNotSignedIn({ ...VALID_LOGIN, password: VALID_LOGIN.password.slice(0, -1) }, 401, INVALID_CREDENTIALS);
    });
  });
  testCase('Attacker submits the stored bcrypt hash as the password', `Login fails with "${INVALID_CREDENTIALS}" (401)`, () => {
    it('layer 2 — api refuses', async () => {
      await expectNotSignedIn({ ...VALID_LOGIN, password: PASSWORD_HASH }, 401, INVALID_CREDENTIALS);
    });
  });
  testCase('User enters an email that is not registered', `Login fails with "${INVALID_CREDENTIALS}" (401)`, () => {
    beforeEach(() => ctx.repository.findAccountForLogin.mockResolvedValue(null as never));
    it('layer 2 — api refuses and records "No account matches this email"', async () => {
      await expectNotSignedIn({ ...VALID_LOGIN, email: 'nobody@cares.ph' }, 401, INVALID_CREDENTIALS);
      expect(ctx.activity.record).toHaveBeenCalledWith(
        expect.objectContaining({ outcome: 'INVALID_CREDENTIALS', failureReason: 'Invalid email or password' }),
      );
    });
  });
  testCase(
    'Wrong password and unregistered email are compared side by side',
    'Both get the identical 401 reply, so the portal never reveals which emails exist',
    () => {
      it('layer 2 — api replies identically', async () => {
        const wrongPassword = await post(ctx, LOGIN.path, { ...VALID_LOGIN, password: 'Wr0ng!Passw0rd' });
        ctx.repository.findAccountForLogin.mockResolvedValue(null as never);
        const unknownEmail = await post(ctx, LOGIN.path, { ...VALID_LOGIN, email: 'nobody@cares.ph' });
        expect(wrongPassword.status).toBe(401);
        expect(unknownEmail.status).toBe(401);
        expect(wrongPassword.body).toEqual(unknownEmail.body);
      });
    },
  );
  testCase('User whose account signs in only through Google/Facebook tries the portal', `Login fails with "${INVALID_CREDENTIALS}" (401)`, () => {
    beforeEach(() => ctx.repository.findAccountForLogin.mockResolvedValue(storedAccount({ password: null }) as never));
    it('layer 2 — api refuses', async () => {
      await expectNotSignedIn(VALID_LOGIN, 401, INVALID_CREDENTIALS);
    });
  });

  /* ── correct credentials, but not allowed in ─────────────────────────── */

  testCase(
    `${NON_PORTAL_ROLES.join(' / ')} enters correct credentials on the portal`,
    'Login fails with "This portal is for administrators only" (403)',
    () => {
      it.each(NON_PORTAL_ROLES)('%s is refused', async (role) => {
        ctx.repository.findAccountForLogin.mockResolvedValue(storedAccount({}, role as RoleType) as never);
        await expectNotSignedIn(VALID_LOGIN, 403, 'This portal is for administrators only');
        expect(ctx.activity.record).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'ROLE_NOT_ALLOWED' }));
      });
    },
  );
  testCase(
    'Admin signs in with a temporary password that has expired',
    'Login fails with "These temporary credentials have expired — ask an administrator to issue new ones" (403)',
    () => {
      beforeEach(() =>
        ctx.repository.findAccountForLogin.mockResolvedValue(
          storedAccount({ credential_expires_at: new Date(Date.now() - 60_000) }) as never,
        ),
      );
      it('layer 2 — api refuses', async () => {
        await expectNotSignedIn(
          VALID_LOGIN,
          403,
          'These temporary credentials have expired — ask an administrator to issue new ones',
        );
      });
    },
  );
  testCase('Admin whose account was restricted with a reason signs in', 'Login fails with "Account restricted: <reason>" (403)', () => {
    beforeEach(() =>
      ctx.repository.findAccountForLogin.mockResolvedValue(
        storedAccount({ is_restricted: true, restriction_reason: 'Under review' }) as never,
      ),
    );
    it('layer 2 — api refuses', async () => {
      await expectNotSignedIn(VALID_LOGIN, 403, 'Account restricted: Under review');
    });
  });
  testCase(
    'Admin whose account was restricted without a reason signs in',
    'Login fails with "This account has been restricted by an administrator" (403)',
    () => {
      beforeEach(() =>
        ctx.repository.findAccountForLogin.mockResolvedValue(storedAccount({ is_restricted: true }) as never),
      );
      it('layer 2 — api refuses', async () => {
        await expectNotSignedIn(VALID_LOGIN, 403, 'This account has been restricted by an administrator');
      });
    },
  );
  testCase(
    'Admin signs in from a network an administrator has blocked',
    'Login fails with "Sign-in from this network has been blocked" (403); the account is never looked up',
    () => {
      beforeEach(() => ctx.repository.findBlockedIp.mockResolvedValue({ ip_address: '127.0.0.1' } as never));
      it('layer 2 — api refuses', async () => {
        await expectNotSignedIn(VALID_LOGIN, 403, 'Sign-in from this network has been blocked');
        expect(ctx.repository.findAccountForLogin).not.toHaveBeenCalled();
      });
    },
  );
  testCase(
    'Admin signs in after 5 failed attempts within 15 minutes',
    'Login fails with "Too many failed sign-in attempts. Try again after …" (403), even with the correct password',
    () => {
      beforeEach(() =>
        ctx.activityRepository.summarizeRecentAttempts.mockResolvedValue({
          failures: 5,
          lastFailureAt: new Date(),
        } as never),
      );
      it('layer 2 — api refuses and records LOCKED_OUT', async () => {
        const outcome = await post(ctx, LOGIN.path, VALID_LOGIN);
        expect(outcome.status).toBe(403);
        expect(outcome.body.message).toMatch(/^Too many failed sign-in attempts\. Try again after /);
        expect(ctx.sessions.create).not.toHaveBeenCalled();
        expect(ctx.repository.findAccountForLogin).not.toHaveBeenCalled();
        expect(ctx.activity.record).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'LOCKED_OUT' }));
      });
    },
  );
  testCase(
    'Admin signs in from an IP address that is not on the allowlist',
    'Login fails with "Sign-in is not allowed from this network" (403)',
    () => {
      beforeEach(() =>
        ctx.securityPolicy.getPolicy.mockResolvedValue({ ...DEFAULT_SECURITY_POLICY, ip_allowlist: ['10.0.0.5'] } as never),
      );
      it('layer 2 — api refuses', async () => {
        await expectNotSignedIn(VALID_LOGIN, 403, 'Sign-in is not allowed from this network');
      });
    },
  );
  testCase(
    'Admin signs in outside the allowed sign-in hours',
    'Login fails with "Sign-in is only allowed between HH:MM and HH:MM" (403)',
    () => {
      beforeEach(() => {
        // A one-minute window that has just closed, whatever the clock says now.
        const now = new Date();
        const minute = now.getHours() * 60 + now.getMinutes();
        const start = (minute + 1) % 1440;
        ctx.securityPolicy.getPolicy.mockResolvedValue({
          ...DEFAULT_SECURITY_POLICY,
          login_hours_enabled: true,
          login_hours_start_minute: start,
          login_hours_end_minute: (start + 1) % 1440,
        } as never);
      });
      it('layer 2 — api refuses', async () => {
        const outcome = await post(ctx, LOGIN.path, VALID_LOGIN);
        expect(outcome.status).toBe(403);
        expect(outcome.body.message).toMatch(/^Sign-in is only allowed between \d{2}:\d{2} and \d{2}:\d{2}$/);
        expect(ctx.sessions.create).not.toHaveBeenCalled();
      });
    },
  );

  /* ── hostile input ───────────────────────────────────────────────────── */

  for (const [family, payloads] of HOSTILE_EMAIL_FAMILIES) {
    testCase(
      `Attacker enters ${family} in the email field (${payloads.length} variants)`,
      'Login fails with "Validation failed" on email (400); nothing reaches the database',
      () => rejectsEachByValidation(ctx, LOGIN, payloads, (value) => ({ ...VALID_LOGIN, email: value }), 'email'),
    );
  }
  testCase(
    `Attacker sends an object, array, number, boolean or null as the email (${OPERATOR_INJECTION_PAYLOADS.length} variants)`,
    'Login fails with "Validation failed" on email (400)',
    () =>
      rejectsEachByValidation(ctx, LOGIN, OPERATOR_INJECTION_PAYLOADS, (value) => ({ ...VALID_LOGIN, email: value }), 'email'),
  );
  testCase(
    `Attacker sends an object, array, number, boolean or null as the password (${OPERATOR_INJECTION_PAYLOADS.length} variants)`,
    'Login fails with "Validation failed" on password (400) — e.g. { $ne: null } cannot bypass the check',
    () =>
      rejectsEachByValidation(
        ctx,
        LOGIN,
        OPERATOR_INJECTION_PAYLOADS,
        (value) => ({ ...VALID_LOGIN, password: value }),
        'password',
      ),
  );
  testCase(
    `Attacker enters SQL injection, special-character, control-character, unicode, XSS and traversal strings as the password (${HOSTILE_STRINGS.length} variants)`,
    `Login fails with "${INVALID_CREDENTIALS}" (401) — the text is accepted by validation, compared as a password and never run as SQL`,
    () => {
      it.each(HOSTILE_STRINGS.map((p) => ({ label: `${p.category}: ${p.label}`, value: p.value as string })))('$label', async ({ value }) => {
        await expectNotSignedIn({ ...VALID_LOGIN, password: value }, 401, INVALID_CREDENTIALS);
      });
    },
  );
  testCase(
    `Attacker adds privileged fields (role_type, is_protected, user_id, permissions) to the body (${MASS_ASSIGNMENT_KEYS.length} variants)`,
    'Login fails with "Validation failed" (400) — unknown fields are rejected',
    () => {
      rejectsEachByValidation(
        ctx,
        LOGIN,
        MASS_ASSIGNMENT_KEYS.map((extra) => ({ category: 'operator-injection', label: Object.keys(extra).join(', '), value: extra })),
        (extra) => ({ ...VALID_LOGIN, ...(extra as object) }),
      );
      it('reports them as unrecognized_keys', async () => {
        const outcome = await runSchemaLayer(LOGIN.schema, { ...VALID_LOGIN, role_type: 'ADMIN' });
        expect(outcome.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'unrecognized_keys' })]));
      });
    },
  );
  testCase(
    `Attacker sends a __proto__ / constructor.prototype body (${PROTOTYPE_POLLUTION_BODIES.length} variants)`,
    'Login fails with "Validation failed" (400); Object.prototype is not polluted',
    () => rejectsPrototypePollution(ctx, LOGIN, VALID_LOGIN, PROTOTYPE_POLLUTION_BODIES),
  );

  /* ── system errors ───────────────────────────────────────────────────── */

  testCase(
    'The database fails while the account is being looked up',
    'Login fails with "Internal server error" (500); no SQL or stack detail is shown',
    () => {
      beforeEach(() =>
        ctx.repository.findAccountForLogin.mockRejectedValue(new Error('syntax error at or near "OR"') as never),
      );
      it('layer 2 — api masks the error', async () => {
        await expectNotSignedIn(VALID_LOGIN, 500, 'Internal server error');
      });
    },
  );
});
