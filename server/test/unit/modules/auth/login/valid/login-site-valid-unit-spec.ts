import { RoleType } from '../../../../../../src/infastructures/prisma/common/client';
import { DEFAULT_SECURITY_POLICY } from '../../../../../../src/modules/security-policy/services/security-policy-service';
import { defineCases } from '../../../../../config/test-case';
import {
  LOGIN,
  MODULE,
  VALID_LOGIN,
  acceptedBySchema,
  hashOf,
  post,
  storedAccount,
  useAuthSiteApp,
} from '../login-site-support';

/**
 * Login — valid inputs. Every case is a legitimate sign-in that the portal must
 * accept: 200, a token is issued, a session is created and the attempt is
 * recorded as SUCCESS.
 */
const testCase = defineCases({ module: MODULE, unit: 'Login', kind: 'valid', prefix: 'LOGIN' });

describe('Login — valid inputs', () => {
  const ctx = useAuthSiteApp();

  const expectSignedIn = async (input: { email: string; password: string }, role: RoleType = RoleType.ADMIN) => {
    const outcome = await post(ctx, LOGIN.path, input);
    expect(outcome.status).toBe(200);
    expect(outcome.body).toEqual(
      expect.objectContaining({
        ok: true,
        message: 'Admin login successful',
        data: expect.objectContaining({ access_token: 'signed-token', role_type: role }),
      }),
    );
    expect(ctx.sessions.create).toHaveBeenCalledTimes(1);
    expect(ctx.activity.record).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'SUCCESS' }));
    return outcome;
  };

  for (const role of [RoleType.ADMIN, RoleType.DIRECTOR, RoleType.COORDINATOR]) {
    testCase(
      `${role} enters a registered email and the correct password`,
      `Login successful — access token issued, session created, signed in as ${role}`,
      () => {
        beforeEach(() => ctx.repository.findAccountForLogin.mockResolvedValue(storedAccount({}, role) as never));
        acceptedBySchema(LOGIN, VALID_LOGIN);
        it('layer 2 — api signs the user in', async () => {
          await expectSignedIn(VALID_LOGIN, role);
        });
      },
    );
  }

  testCase(
    'Admin enters the email in mixed case with spaces around it',
    'Email is trimmed and lower-cased; login successful',
    () => {
      const input = { email: '  Admin@CARES.ph ', password: VALID_LOGIN.password };
      acceptedBySchema(LOGIN, input);
      it('layer 2 — api looks up the canonical email and signs in', async () => {
        await expectSignedIn(input);
        expect(ctx.repository.findAccountForLogin).toHaveBeenCalledWith('admin@cares.ph');
      });
    },
  );

  testCase(
    'Admin whose email contains a legitimate apostrophe signs in',
    'Login successful',
    () => {
      const input = { email: "o'neil@cares.ph", password: VALID_LOGIN.password };
      beforeEach(() =>
        ctx.repository.findAccountForLogin.mockResolvedValue(storedAccount({ email: input.email }) as never),
      );
      acceptedBySchema(LOGIN, input);
      it('layer 2 — api signs the user in', async () => {
        await expectSignedIn(input);
      });
    },
  );

  testCase(
    'Admin whose password contains quotes, symbols and SQL keywords enters it correctly',
    'Password is compared as plain text, not as SQL; login successful',
    () => {
      const password = `P@ss' OR '1'='1"; --<b>`;
      const input = { email: VALID_LOGIN.email, password };
      beforeEach(() =>
        ctx.repository.findAccountForLogin.mockResolvedValue(storedAccount({ password: hashOf(password) }) as never),
      );
      acceptedBySchema(LOGIN, input);
      it('layer 2 — api signs the user in', async () => {
        await expectSignedIn(input);
      });
    },
  );

  testCase(
    'Admin signs in with a temporary password that has not expired yet',
    'Login successful',
    () => {
      beforeEach(() =>
        ctx.repository.findAccountForLogin.mockResolvedValue(
          storedAccount({ credential_expires_at: new Date(Date.now() + 86_400_000) }) as never,
        ),
      );
      it('layer 2 — api signs the user in', async () => {
        await expectSignedIn(VALID_LOGIN);
      });
    },
  );

  testCase(
    'Admin signs in after 4 failed attempts (lockout limit is 5)',
    'Login successful — the account is not locked yet',
    () => {
      beforeEach(() =>
        ctx.activityRepository.summarizeRecentAttempts.mockResolvedValue({
          failures: 4,
          lastFailureAt: new Date(),
        } as never),
      );
      it('layer 2 — api signs the user in', async () => {
        await expectSignedIn(VALID_LOGIN);
      });
    },
  );

  testCase(
    'Admin signs in from an IP address on the security-policy allowlist',
    'Login successful',
    () => {
      beforeEach(() =>
        ctx.securityPolicy.getPolicy.mockResolvedValue({
          ...DEFAULT_SECURITY_POLICY,
          ip_allowlist: ['127.0.0.1', '::ffff:127.0.0.1', '::1'],
        } as never),
      );
      it('layer 2 — api signs the user in', async () => {
        await expectSignedIn(VALID_LOGIN);
      });
    },
  );

  testCase(
    'Successful sign-in returns the user profile the portal needs',
    'Response carries user id, role, email, names, permissions and suspensions — no password hash',
    () => {
      it('layer 2 — api returns the profile without secrets', async () => {
        const outcome = await expectSignedIn(VALID_LOGIN);
        expect(outcome.body.data).toEqual({
          user_id: 'user-1',
          role_type: RoleType.ADMIN,
          email: VALID_LOGIN.email,
          firstname: 'Ada',
          lastname: 'Lovelace',
          has_interests: false,
          access_token: 'signed-token',
          permissions: [],
          suspensions: [],
        });
        expect(JSON.stringify(outcome.body)).not.toContain('$2b$');
      });
    },
  );
});
