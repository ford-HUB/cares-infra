import { RoleType } from '../../../../../../src/infastructures/prisma/common/client';
import { expectSafeErrorEnvelope } from '../../../../../config/layer-harness';
import {
  CONTROL_CHAR_PAYLOADS,
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
  FORGOT,
  MODULE,
  NON_PORTAL_ROLES,
  VALID_FORGOT,
  expectRefusal,
  post,
  rejectsByValidation,
  rejectsEachByValidation,
  rejectsPrototypePollution,
  storedAccount,
  useAuthSiteApp,
} from '../login-site-support';

/**
 * Forgot Password — invalid inputs. Each case Passes when the request is refused
 * as stated and no temporary password is mailed or written.
 */
const testCase = defineCases({ module: MODULE, unit: 'Forgot Password', kind: 'invalid', prefix: 'FORGOT' });

const NOT_REGISTERED = 'No administrator account is registered with this email';

const HOSTILE_EMAIL_FAMILIES: [string, SecurityPayload[]][] = [
  ['SQL injection strings', SQL_INJECTION_PAYLOADS],
  ['special-character series', specialCharacterSeries()],
  ['control characters (null byte, CRLF, tab …)', CONTROL_CHAR_PAYLOADS],
  ['look-alike unicode characters', UNICODE_CONFUSABLE_PAYLOADS],
  ['XSS markup', XSS_PAYLOADS],
  ['path-traversal strings', PATH_TRAVERSAL_PAYLOADS],
];

describe('Forgot Password — invalid inputs', () => {
  const ctx = useAuthSiteApp();

  const expectNothingSent = async (input: unknown, status: number, message: string) => {
    const outcome = await post(ctx, FORGOT.path, input);
    expectRefusal(outcome, status, message);
    expectSafeErrorEnvelope(outcome);
    expect(ctx.repository.updatePasswordByEmail).not.toHaveBeenCalled();
    return outcome;
  };

  testCase('Admin leaves the email field empty', 'Request fails with "Validation failed" on email (400)', () =>
    rejectsByValidation(ctx, FORGOT, { email: '' }, 'email'),
  );
  testCase('Admin enters only spaces in the email field', 'Request fails with "Validation failed" on email (400)', () =>
    rejectsByValidation(ctx, FORGOT, { email: '   ' }, 'email'),
  );
  testCase('Request is sent without an email field', 'Request fails with "Validation failed" on email (400)', () =>
    rejectsByValidation(ctx, FORGOT, {}, 'email'),
  );
  testCase('Admin enters an invalid email format ("admin@")', 'Request fails with "Validation failed" on email (400)', () =>
    rejectsByValidation(ctx, FORGOT, { email: 'admin@' }, 'email'),
  );
  testCase('Admin enters an invalid email format ("admin.cares.ph")', 'Request fails with "Validation failed" on email (400)', () =>
    rejectsByValidation(ctx, FORGOT, { email: 'admin.cares.ph' }, 'email'),
  );

  testCase('Admin enters an email that is not registered', `Temporary password not sent; "${NOT_REGISTERED}" (404)`, () => {
    beforeEach(() => ctx.repository.findAccountForLogin.mockResolvedValue(null as never));
    it('layer 2 — api refuses and sends no mail', async () => {
      await expectNothingSent({ email: 'nobody@cares.ph' }, 404, NOT_REGISTERED);
      expect(ctx.mailer.sendEmail).not.toHaveBeenCalled();
    });
  });
  testCase(
    `${NON_PORTAL_ROLES.join(' / ')} enters their registered email on the portal`,
    `Temporary password not sent; "${NOT_REGISTERED}" (404)`,
    () => {
      it.each(NON_PORTAL_ROLES)('%s is refused', async (role) => {
        ctx.repository.findAccountForLogin.mockResolvedValue(storedAccount({}, role as RoleType) as never);
        await expectNothingSent(VALID_FORGOT, 404, NOT_REGISTERED);
        expect(ctx.mailer.sendEmail).not.toHaveBeenCalled();
      });
    },
  );
  testCase(
    'Admin whose account signs in only through Google/Facebook requests a reset',
    'Temporary password not sent; "This account has no password to reset. Contact an administrator." (400)',
    () => {
      beforeEach(() => ctx.repository.findAccountForLogin.mockResolvedValue(storedAccount({ password: null }) as never));
      it('layer 2 — api refuses', async () => {
        await expectNothingSent(VALID_FORGOT, 400, 'This account has no password to reset. Contact an administrator.');
        expect(ctx.mailer.sendEmail).not.toHaveBeenCalled();
      });
    },
  );
  testCase(
    'Admin whose account is restricted requests a reset',
    'Temporary password not sent; "This account has been restricted by an administrator" (403)',
    () => {
      beforeEach(() =>
        ctx.repository.findAccountForLogin.mockResolvedValue(storedAccount({ is_restricted: true }) as never),
      );
      it('layer 2 — api refuses', async () => {
        await expectNothingSent(VALID_FORGOT, 403, 'This account has been restricted by an administrator');
        expect(ctx.mailer.sendEmail).not.toHaveBeenCalled();
      });
    },
  );
  testCase(
    'Admin requests a second temporary password within the 2-minute cooldown',
    'Request fails with "A temporary password was sent recently. Please wait 95 seconds before requesting another." (429)',
    () => {
      beforeEach(() => {
        ctx.redis.get.mockResolvedValue('sent' as never);
        ctx.redis.ttl.mockResolvedValue(95 as never);
      });
      it('layer 2 — api refuses and keeps the password already mailed', async () => {
        await expectNothingSent(
          VALID_FORGOT,
          429,
          'A temporary password was sent recently. Please wait 95 seconds before requesting another.',
        );
        expect(ctx.mailer.sendEmail).not.toHaveBeenCalled();
      });
    },
  );
  testCase(
    'The email server is down when the temporary password is sent',
    'Request fails with "Unable to send temporary password email. …" (502); the old password keeps working',
    () => {
      beforeEach(() => ctx.mailer.sendEmail.mockRejectedValue(new Error('SMTP connection refused') as never));
      it('layer 2 — api refuses and does not overwrite the password', async () => {
        await expectNothingSent(VALID_FORGOT, 502, 'Unable to send temporary password email. SMTP connection refused');
        expect(ctx.redis.set).not.toHaveBeenCalled();
      });
    },
  );

  for (const [family, payloads] of HOSTILE_EMAIL_FAMILIES) {
    testCase(
      `Attacker enters ${family} in the email field (${payloads.length} variants)`,
      'Request fails with "Validation failed" on email (400); nothing reaches the database',
      () => rejectsEachByValidation(ctx, FORGOT, payloads, (value) => ({ email: value }), 'email'),
    );
  }
  testCase(
    `Attacker sends an object, array, number, boolean or null as the email (${OPERATOR_INJECTION_PAYLOADS.length} variants)`,
    'Request fails with "Validation failed" on email (400)',
    () => rejectsEachByValidation(ctx, FORGOT, OPERATOR_INJECTION_PAYLOADS, (value) => ({ email: value }), 'email'),
  );
  testCase(
    `Attacker adds privileged fields to the body (${MASS_ASSIGNMENT_KEYS.length} variants)`,
    'Request fails with "Validation failed" (400) — unknown fields are rejected',
    () =>
      rejectsEachByValidation(
        ctx,
        FORGOT,
        MASS_ASSIGNMENT_KEYS.map((extra) => ({ category: 'operator-injection', label: Object.keys(extra).join(', '), value: extra })),
        (extra) => ({ ...VALID_FORGOT, ...(extra as object) }),
      ),
  );
  testCase(
    `Attacker sends a __proto__ / constructor.prototype body (${PROTOTYPE_POLLUTION_BODIES.length} variants)`,
    'Request fails with "Validation failed" (400); Object.prototype is not polluted',
    () => rejectsPrototypePollution(ctx, FORGOT, VALID_FORGOT, PROTOTYPE_POLLUTION_BODIES),
  );

  testCase(
    'The database fails while the account is being looked up',
    'Request fails with "Internal server error" (500); no SQL or stack detail is shown',
    () => {
      beforeEach(() =>
        ctx.repository.findAccountForLogin.mockRejectedValue(new Error('relation "Account" does not exist') as never),
      );
      it('layer 2 — api masks the error', async () => {
        await expectNothingSent(VALID_FORGOT, 500, 'Internal server error');
      });
    },
  );
});
