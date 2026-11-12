import * as bcrypt from 'bcrypt';
import { RoleType } from '../../../../../../src/infastructures/prisma/common/client';
import { TemplateUtils } from '../../../../../../src/shared/utils/templete-utils';
import { defineCases } from '../../../../../config/test-case';
import {
  FORGOT,
  MODULE,
  PORTAL_ROLES,
  VALID_FORGOT,
  acceptedBySchema,
  post,
  storedAccount,
  useAuthSiteApp,
} from '../login-site-support';

/**
 * Forgot Password — valid inputs. The portal has no OTP step: a registered
 * administrator's email gets a temporary password, the stored hash is replaced
 * only after the mail is sent, and a 2-minute cooldown starts.
 */
const testCase = defineCases({ module: MODULE, unit: 'Forgot Password', kind: 'valid', prefix: 'FORGOT' });

describe('Forgot Password — valid inputs', () => {
  const ctx = useAuthSiteApp();

  const expectTemporaryPasswordSent = async (input: { email: string }, canonical = VALID_FORGOT.email) => {
    const outcome = await post(ctx, FORGOT.path, input);
    expect(outcome.status).toBe(200);
    expect(outcome.body).toEqual({
      ok: true,
      message: 'Temporary password sent',
      data: { email: canonical, retry_after_seconds: 120 },
    });
    expect(ctx.mailer.sendEmail).toHaveBeenCalledWith(canonical, 'Your temporary CARES portal password', expect.any(String));
    expect(ctx.repository.updatePasswordByEmail).toHaveBeenCalledWith(canonical, expect.stringMatching(/^\$2[aby]\$/));
    expect(ctx.redis.set).toHaveBeenCalledWith(`portal-password-reset:cooldown:${canonical}`, 'sent', 120);
    return outcome;
  };

  for (const role of PORTAL_ROLES) {
    testCase(
      `${role} enters a registered email`,
      'Temporary password emailed; "Temporary password sent" with a 120-second retry timer',
      () => {
        beforeEach(() => ctx.repository.findAccountForLogin.mockResolvedValue(storedAccount({}, role as RoleType) as never));
        acceptedBySchema(FORGOT, VALID_FORGOT);
        it('layer 2 — api sends the temporary password', async () => {
          await expectTemporaryPasswordSent(VALID_FORGOT);
        });
      },
    );
  }

  testCase(
    'Admin enters the registered email in mixed case with spaces around it',
    'Email is trimmed and lower-cased; temporary password sent to the canonical address',
    () => {
      const input = { email: '  Admin@CARES.ph ' };
      acceptedBySchema(FORGOT, input);
      it('layer 2 — api sends to the canonical email', async () => {
        await expectTemporaryPasswordSent(input);
        expect(ctx.repository.findAccountForLogin).toHaveBeenCalledWith('admin@cares.ph');
      });
    },
  );

  testCase(
    'Admin requests again after the 2-minute cooldown has passed',
    'Temporary password sent again',
    () => {
      it('layer 2 — api sends the temporary password', async () => {
        ctx.redis.get.mockResolvedValue(null as never);
        await expectTemporaryPasswordSent(VALID_FORGOT);
      });
    },
  );

  testCase(
    'The temporary password that is issued satisfies the security policy',
    'Stored hash matches a password with ≥ 8 characters, an uppercase, a lowercase and a number',
    () => {
      it('layer 2 — api stores a policy-compliant password', async () => {
        let mailed = '';
        (TemplateUtils.compileTemplate as jest.Mock).mockImplementationOnce(async (_name: string, data: any) => {
          mailed = data.temporaryPassword;
          return '<p>temporary password</p>';
        });

        await expectTemporaryPasswordSent(VALID_FORGOT);
        expect(mailed).toMatch(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/);
        const storedHash = ctx.repository.updatePasswordByEmail.mock.calls[0][1] as string;
        expect(bcrypt.compareSync(mailed, storedHash)).toBe(true);
      });
    },
  );
});
