import { AuthRepository } from '../repositories/auth-repository';
import {
  AccessRequestDto,
  AccessRequestResponseDto,
  AdminLoginResponseDto,
  LoginDto,
  MeResponseDto,
  PortalForgotPasswordResponseDto,
} from '../dto/auth-site-dto';
import {
  ACCESS_REQUEST_ALLOWED_MIME_TYPES,
  ACCESS_REQUEST_MAX_FILES,
  ACCESS_REQUEST_MAX_FILE_BYTES,
  ACCESS_REQUEST_MAX_TOTAL_BYTES,
} from '../validators/auth-site-validator';
import { NodemailerService } from 'src/infastructures/nodemailer/nodemailer-service';
import type { MailAttachment } from 'src/infastructures/nodemailer/nodemailer-service';
import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { RedisService } from 'src/infastructures/redis/redis-service';
import { TemplateUtils } from 'src/shared/utils/templete-utils';
import { DurationUtils } from 'src/shared/utils/duration-utils';
import { JwtService } from 'src/infastructures/jwt/jwt-service';
import { JwtPayload } from 'src/shared/types/jwt-payload';
import { isPortalRole } from 'src/shared/constants/portal-role-types';
import { isProtectedAdminEmail } from 'src/shared/constants/protected-admin';
import { ConfigService } from '@nestjs/config';
import { LoginActivityRecorder } from 'src/modules/login-activity/services/login-activity-recorder';
import { SessionRegistry } from 'src/modules/sessions/services/session-registry';
import { LoginPolicyEnforcer } from 'src/modules/security-policy/services/login-policy-enforcer';
import { AuditLogRecorder } from 'src/modules/audit-logs/services/audit-log-recorder';
import { AccessControlSiteService } from 'src/modules/access-control/services/access-control-site-service';
import type { RequestContextDto } from 'src/shared/decorators/request-context-decorator';
import {
  RoleType,
  type AuditSeverity,
} from 'src/infastructures/prisma/common/client';

/** Where the reset mail's button points when SITE_URL is unset. */
const DEFAULT_PORTAL_URL = 'http://localhost:5173';
/** Path on the portal that reads `?token=` and shows the new-password form. */
const PORTAL_RESET_PASSWORD_PATH = '/reset-password';
/** How long the emailed link works. */
const RESET_LINK_TTL = DurationUtils.FIFTEEN_MINUTES;
/** Minimum gap between two reset mails for the same address. */
const RESET_LINK_COOLDOWN = DurationUtils.ONE_MINUTE * 2;

@Injectable()
export class AuthSiteService {
  constructor(
    private readonly redisService: RedisService,
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly loginActivityRecorder: LoginActivityRecorder,
    private readonly sessionRegistry: SessionRegistry,
    private readonly loginPolicyEnforcer: LoginPolicyEnforcer,
    private readonly auditLogRecorder: AuditLogRecorder,
    private readonly nodemailerService: NodemailerService,
    private readonly accessControlSiteService: AccessControlSiteService,
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

    // Social-only accounts (donors, on mobile) have no stored hash and no portal
    // presence. Same reply as a wrong password, for the same reason.
    if (!account.password) {
      const reason = 'Account signs in through a social provider';
      await this.loginActivityRecorder.record({
        ...attempt,
        userId: account.user.user_id,
        outcome: 'INVALID_CREDENTIALS',
        failureReason: reason,
      });
      await this.recordSignIn(attempt, {
        outcome: 'FAILURE',
        severity: 'NOTICE',
        description: `Failed portal sign-in for ${email}`,
        reason,
        userId: account.user.user_id,
        roleType: account.user.role.type,
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

    if (account.is_restricted) {
      const message = account.restriction_reason
        ? `Account restricted: ${account.restriction_reason}`
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

    const rights = await this.accessControlSiteService.sessionRightsFor(
      account.user.user_id,
    );

    return {
      user_id: account.user.user_id,
      role_type: account.user.role.type,
      email: account.email,
      firstname: account.user.firstname,
      lastname: account.user.lastname,
      has_interests: account.user.user_interest !== null,
      permissions: rights.permissions,
      suspensions: rights.suspensions,
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

  /**
   * "Forgot password" on the portal login page: confirm the email belongs to a portal
   * account, then mail a single-use link. Unlike the mobile flow this hands out a
   * link rather than a code, because the admin is already in a browser and the link
   * lands them straight on the new-password form.
   */
  async requestPasswordReset(
    email: string,
    context: RequestContextDto = {},
  ): Promise<PortalForgotPasswordResponseDto> {
    const normalizedEmail = email.trim().toLowerCase();

    const account =
      await this.authRepository.findAccountForLogin(normalizedEmail);
    if (!account || !isPortalRole(account.user.role.type)) {
      throw new NotFoundException(
        'No administrator account is registered with this email',
      );
    }
    if (!account.password) {
      throw new BadRequestException(
        'This account has no password to reset. Contact an administrator.',
      );
    }
    if (account.is_restricted) {
      throw new ForbiddenException(
        'This account has been restricted by an administrator',
      );
    }

    // One mail per cooldown window. A second request inside the window is refused
    // outright — the first link is still on its way and still works.
    const cooldownKey = this.resetCooldownKey(normalizedEmail);
    if (await this.redisService.get<string>(cooldownKey)) {
      const remaining = await this.redisService.ttl(cooldownKey);
      const seconds = remaining > 0 ? remaining : RESET_LINK_COOLDOWN;
      throw new HttpException(
        `A reset link was sent recently. Please wait ${seconds} seconds before requesting another.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // The raw token only ever exists in the email; Redis holds its hash, so a
    // leaked dump cannot be turned into a working link.
    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashResetToken(token);
    const portalUrl = (
      this.configService.get<string>('SITE_URL')?.trim() || DEFAULT_PORTAL_URL
    ).replace(/\/+$/, '');
    const resetUrl = `${portalUrl}${PORTAL_RESET_PASSWORD_PATH}?token=${token}`;

    const template = await TemplateUtils.compileTemplate(
      'portal-password-reset-link.html',
      {
        username: account.user.firstname || normalizedEmail,
        resetUrl,
        portalUrl,
        expiresInMinutes: RESET_LINK_TTL / 60,
      },
    );

    try {
      await this.nodemailerService.sendEmail(
        normalizedEmail,
        'Reset your CARES portal password',
        template,
      );
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : 'Email delivery failed';
      throw new BadGatewayException(`Unable to send reset email. ${detail}`);
    }

    // A fresh request retires the previous link so only the newest mail works.
    await this.clearPasswordResetState(normalizedEmail);
    await this.redisService.set(
      this.resetTokenKey(tokenHash),
      normalizedEmail,
      RESET_LINK_TTL,
    );
    await this.redisService.set(
      this.resetEmailKey(normalizedEmail),
      tokenHash,
      RESET_LINK_TTL,
    );
    await this.redisService.set(cooldownKey, 'sent', RESET_LINK_COOLDOWN);

    await this.auditLogRecorder.record({
      action: 'auth.portal.password-reset.requested',
      description: `Password reset link requested for ${normalizedEmail}`,
      category: 'AUTHENTICATION',
      severity: 'NOTICE',
      actor: {
        sub: account.user.user_id,
        email: normalizedEmail,
        role_type: account.user.role.type,
      },
      targetType: 'user',
      targetLabel: normalizedEmail,
      targetId: account.user.user_id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return {
      email: normalizedEmail,
      expires_in_seconds: RESET_LINK_TTL,
      retry_after_seconds: RESET_LINK_COOLDOWN,
    };
  }

  private hashResetToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private resetTokenKey(tokenHash: string): string {
    return `portal-password-reset:token:${tokenHash}`;
  }

  private resetEmailKey(email: string): string {
    return `portal-password-reset:email:${email}`;
  }

  private resetCooldownKey(email: string): string {
    return `portal-password-reset:cooldown:${email}`;
  }

  /** Drops the live link for this email, if any. The cooldown is left to run out. */
  private async clearPasswordResetState(email: string): Promise<void> {
    const emailKey = this.resetEmailKey(email);
    const activeHash = await this.redisService.get<string>(emailKey);
    if (activeHash) {
      await this.redisService.delete(this.resetTokenKey(activeHash));
    }
    await this.redisService.delete(emailKey);
  }

  async getMe(user: JwtPayload): Promise<MeResponseDto> {
    const profile = await this.authRepository.findUserProfile(user.sub);
    if (!profile) {
      throw new UnauthorizedException('User not found');
    }

    const email = profile.accounts[0]?.email ?? user.email;
    const rights = await this.accessControlSiteService.sessionRightsFor(
      profile.user_id,
    );

    return {
      user_id: profile.user_id,
      email,
      firstname: profile.firstname,
      lastname: profile.lastname,
      role_type: profile.role.type,
      is_protected: isProtectedAdminEmail(email, this.configService),
      permissions: rights.permissions,
      suspensions: rights.suspensions,
    };
  }

  /**
   * Request Access on the portal login page: relays the applicant's message and their
   * ID attachments to the CARES support inbox. No account is created here — an admin
   * reads the mail and provisions the account manually.
   */
  async submitAccessRequest(
    data: AccessRequestDto,
    files: Express.Multer.File[] = [],
  ): Promise<AccessRequestResponseDto> {
    const attachments = this.buildAccessRequestAttachments(files);
    const recipient =
      this.configService.get<string>('ACCESS_REQUEST_EMAIL') ??
      'careeesadmin@gmail.com';

    try {
      await this.nodemailerService.sendEmail(
        recipient,
        data.subject,
        this.renderAccessRequestEmail(data, attachments),
        { replyTo: data.from_email, attachments },
      );
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : 'Email delivery failed';
      throw new BadGatewayException(
        `Unable to send your access request. ${detail}`,
      );
    }

    return {
      delivered_to: recipient,
      attachment_count: attachments.length,
    };
  }

  private buildAccessRequestAttachments(
    files: Express.Multer.File[],
  ): MailAttachment[] {
    if (files.length > ACCESS_REQUEST_MAX_FILES) {
      throw new BadRequestException(
        `Attach at most ${ACCESS_REQUEST_MAX_FILES} files`,
      );
    }

    let total = 0;
    return files.map((file) => {
      if (!file.size) {
        throw new BadRequestException(`${file.originalname} is empty`);
      }
      if (file.size > ACCESS_REQUEST_MAX_FILE_BYTES) {
        throw new BadRequestException(
          `${file.originalname} exceeds the 5 MB per-file limit`,
        );
      }
      if (!ACCESS_REQUEST_ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        throw new BadRequestException(
          `${file.originalname} is not an accepted file type`,
        );
      }

      total += file.size;
      if (total > ACCESS_REQUEST_MAX_TOTAL_BYTES) {
        throw new BadRequestException(
          'The attachments exceed the 15 MB combined limit',
        );
      }

      return {
        filename: file.originalname,
        content: file.buffer,
        contentType: file.mimetype,
      };
    });
  }

  private renderAccessRequestEmail(
    data: AccessRequestDto,
    attachments: MailAttachment[],
  ): string {
    const escape = (value: string) =>
      value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const attachmentList = attachments.length
      ? attachments.map((file) => `<li>${escape(file.filename)}</li>`).join('')
      : '<li>None</li>';

    return `
      <p><strong>From:</strong> ${escape(data.from_email)}</p>
      <p><strong>Subject:</strong> ${escape(data.subject)}</p>
      <pre style="font-family: inherit; white-space: pre-wrap;">${escape(data.body)}</pre>
      <p><strong>Attachments</strong></p>
      <ul>${attachmentList}</ul>
    `;
  }
}
