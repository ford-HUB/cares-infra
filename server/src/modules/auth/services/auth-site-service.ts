import { AuthRepository } from '../repositories/auth-repository';
import {
  AdminLoginResponseDto,
  LoginDto,
  MeResponseDto,
} from '../dto/auth-site-dto';
import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from 'src/infastructures/jwt/jwt-service';
import { JwtPayload } from 'src/shared/types/jwt-payload';
import { isPortalRole } from 'src/shared/constants/portal-role-types';
import { isProtectedAdminEmail } from 'src/shared/constants/protected-admin';
import { ConfigService } from '@nestjs/config';
import { LoginActivityRecorder } from 'src/modules/login-activity/services/login-activity-recorder';
import { SessionRegistry } from 'src/modules/sessions/services/session-registry';
import { LoginPolicyEnforcer } from 'src/modules/security-policy/services/login-policy-enforcer';
import { AuditLogRecorder } from 'src/modules/audit-logs/services/audit-log-recorder';
import type { RequestContextDto } from 'src/shared/decorators/request-context-decorator';
import {
  RoleType,
  type AuditSeverity,
} from 'src/infastructures/prisma/common/client';

@Injectable()
export class AuthSiteService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly loginActivityRecorder: LoginActivityRecorder,
    private readonly sessionRegistry: SessionRegistry,
    private readonly loginPolicyEnforcer: LoginPolicyEnforcer,
    private readonly auditLogRecorder: AuditLogRecorder,
  ) {}

  async adminLogin(
    data: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AdminLoginResponseDto> {
    const email = data.email.trim().toLowerCase();
    const attempt = { email, ipAddress, userAgent, source: 'PORTAL' as const };

    if (ipAddress && (await this.authRepository.findBlockedIp(ipAddress))) {
      const message = 'Sign-in from this network has been blocked';
      await this.loginActivityRecorder.record({
        ...attempt,
        outcome: 'BLOCKED_IP',
        failureReason: message,
      });
      await this.recordSignIn(attempt, {
        outcome: 'DENIED',
        severity: 'CRITICAL',
        description: `Sign-in from a blocked network refused for ${email}`,
        reason: message,
      });
      throw new ForbiddenException(message);
    }

    // Hours, allowlist and lockout are checked before the account is even looked up:
    // they refuse the attempt itself, so whether the email exists is beside the point.
    await this.loginPolicyEnforcer.assertLoginAllowed(attempt);

    const account = await this.authRepository.findAccountForLogin(email);
    if (!account) {
      await this.loginActivityRecorder.record({
        ...attempt,
        outcome: 'INVALID_CREDENTIALS',
        failureReason: 'No account matches this email',
      });
      await this.recordSignIn(attempt, {
        outcome: 'FAILURE',
        severity: 'NOTICE',
        description: `Failed portal sign-in for ${email}`,
        reason: 'No account matches this email',
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    let passwordMatches = false;
    try {
      passwordMatches = await bcrypt.compare(data.password, account.password);
    } catch {
      passwordMatches = false;
    }

    if (!passwordMatches) {
      await this.loginActivityRecorder.record({
        ...attempt,
        userId: account.user.user_id,
        outcome: 'INVALID_CREDENTIALS',
        failureReason: 'Incorrect password',
      });
      await this.recordSignIn(attempt, {
        outcome: 'FAILURE',
        severity: 'NOTICE',
        description: `Failed portal sign-in for ${email}`,
        reason: 'Incorrect password',
        userId: account.user.user_id,
        roleType: account.user.role.type,
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!isPortalRole(account.user.role.type)) {
      const message = 'This portal is for administrators only';
      await this.loginActivityRecorder.record({
        ...attempt,
        userId: account.user.user_id,
        outcome: 'ROLE_NOT_ALLOWED',
        failureReason: message,
      });
      await this.recordSignIn(attempt, {
        outcome: 'DENIED',
        // Valid credentials reaching a portal they hold no role for is worth a
        // second look, even though the refusal itself worked as intended.
        severity: 'WARNING',
        description: `Portal sign-in refused for ${email} — not a portal role`,
        reason: message,
        userId: account.user.user_id,
        roleType: account.user.role.type,
      });
      throw new ForbiddenException(message);
    }

    // A provisioned credential stops working on its own. The account stays as it is,
    // so an administrator re-issues from the user list rather than recreating it.
    if (
      account.credential_expires_at &&
      account.credential_expires_at.getTime() <= Date.now()
    ) {
      const message =
        'These temporary credentials have expired — ask an administrator to issue new ones';
      await this.loginActivityRecorder.record({
        ...attempt,
        userId: account.user.user_id,
        outcome: 'CREDENTIAL_EXPIRED',
        failureReason: message,
      });
      await this.recordSignIn(attempt, {
        outcome: 'DENIED',
        severity: 'NOTICE',
        description: `Portal sign-in refused for ${email} — credentials expired`,
        reason: message,
        userId: account.user.user_id,
        roleType: account.user.role.type,
      });
      throw new ForbiddenException(message);
    }

    if (account.user.is_restricted) {
      const message = account.user.restriction_reason
        ? `Account restricted: ${account.user.restriction_reason}`
        : 'This account has been restricted by an administrator';
      await this.loginActivityRecorder.record({
        ...attempt,
        userId: account.user.user_id,
        outcome: 'RESTRICTED_ACCOUNT',
        failureReason: message,
      });
      await this.recordSignIn(attempt, {
        outcome: 'DENIED',
        severity: 'WARNING',
        description: `Portal sign-in refused for ${email} — account restricted`,
        reason: message,
        userId: account.user.user_id,
        roleType: account.user.role.type,
      });
      throw new ForbiddenException(message);
    }

    if (ipAddress) {
      await this.authRepository.recordLoginIp(account.user.user_id, ipAddress);
    }

    await this.loginActivityRecorder.record({
      ...attempt,
      userId: account.user.user_id,
      outcome: 'SUCCESS',
    });

    const signedInAs =
      `${account.user.firstname} ${account.user.lastname}`.trim() || email;

    await this.recordSignIn(attempt, {
      outcome: 'SUCCESS',
      severity: 'INFO',
      description: `${signedInAs} signed in to the portal`,
      userId: account.user.user_id,
      roleType: account.user.role.type,
    });

    // The session is what makes this token revocable — see `SessionGuard`.
    const session = await this.sessionRegistry.create({
      userId: account.user.user_id,
      email: account.email,
      roleType: account.user.role.type,
      source: 'PORTAL',
      ipAddress,
      userAgent,
    });

    return {
      user_id: account.user.user_id,
      role_type: account.user.role.type,
      email: account.email,
      firstname: account.user.firstname,
      lastname: account.user.lastname,
      has_interests: account.user.user_interest !== null,
      access_token: this.jwtService.sign({
        sub: account.user.user_id,
        email: account.email,
        role_type: account.user.role.type,
        sid: session.session_id,
      }),
    };
  }

  /** Ends only the caller's own device; other sessions of the account stay signed in. */
  async logout(
    user: JwtPayload,
    context: RequestContextDto = {},
  ): Promise<void> {
    if (user.sid) {
      await this.sessionRegistry.revoke(user.sid);
    }

    await this.auditLogRecorder.record({
      action: 'auth.portal.signed-out',
      description: `${user.email} signed out of the portal`,
      category: 'AUTHENTICATION',
      actor: user,
      targetType: 'user',
      targetLabel: user.email,
      targetId: user.sub,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
  }

  /**
   * The audit entry beside the sign-in trail. `LoginActivity` answers "who tried to
   * sign in"; this puts the same event in the one place an operator reviews every
   * privileged action, so a refused sign-in sits next to what followed it.
   *
   * A refused attempt has no token behind it, so the actor is written from the
   * submitted email rather than resolved from an account that may not exist.
   */
  private async recordSignIn(
    attempt: { email: string; ipAddress?: string; userAgent?: string },
    entry: {
      outcome: 'SUCCESS' | 'FAILURE' | 'DENIED';
      severity: AuditSeverity;
      description: string;
      reason?: string;
      userId?: string;
      roleType?: RoleType;
    },
  ): Promise<void> {
    await this.auditLogRecorder.record({
      action: 'auth.portal.sign-in',
      description: entry.description,
      category: 'AUTHENTICATION',
      severity: entry.severity,
      outcome: entry.outcome,
      // There is no token yet at sign-in time, so the actor is assembled from the
      // attempt. A null actor — an email matching no account — is recorded as the
      // system, which is exactly what an unattributable attempt is.
      actor: entry.userId
        ? {
            sub: entry.userId,
            email: attempt.email,
            role_type: entry.roleType ?? RoleType.VOLUNTEER,
          }
        : null,
      targetType: 'user',
      targetLabel: attempt.email,
      targetId: entry.userId ?? null,
      ipAddress: attempt.ipAddress,
      userAgent: attempt.userAgent,
      reason: entry.reason ?? null,
    });
  }

  async getMe(user: JwtPayload): Promise<MeResponseDto> {
    const profile = await this.authRepository.findUserProfile(user.sub);
    if (!profile) {
      throw new UnauthorizedException('User not found');
    }

    const email = profile.accounts[0]?.email ?? user.email;

    return {
      user_id: profile.user_id,
      email,
      firstname: profile.firstname,
      lastname: profile.lastname,
      role_type: profile.role.type,
      is_protected: isProtectedAdminEmail(email, this.configService),
    };
  }
}
