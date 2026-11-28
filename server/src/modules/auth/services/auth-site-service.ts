import { AuthRepository } from '../repositories/auth-repository';
import {
  AccessRequestDto,
  AccessRequestResponseDto,
  AdminLoginResponseDto,
  LoginDto,
  MeResponseDto,
  PortalForgotPasswordResponseDto,
  RegistrationStatusResponseDto,
} from '../dto/auth-site-dto';
import {
  ACCESS_REQUEST_ALLOWED_MIME_TYPES,
  ACCESS_REQUEST_MAX_FILES,
  ACCESS_REQUEST_MAX_FILE_BYTES,
  ACCESS_REQUEST_MAX_TOTAL_BYTES,
} from '../validators/auth-site-validator';
import { NodemailerService } from 'src/infastructures/nodemailer/nodemailer-service';
import type { MailAttachment } from 'src/infastructures/nodemailer/mail-types';
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
import { RedisService } from 'src/infastructures/redis/redis-service';
import { TemplateUtils } from 'src/shared/utils/templete-utils';
import { DurationUtils } from 'src/shared/utils/duration-utils';
import { generateTemporaryPassword } from 'src/shared/utils/temporary-credential-utils';
import { JwtService } from 'src/infastructures/jwt/jwt-service';
import { JwtPayload } from 'src/shared/types/jwt-payload';
import { isPortalRole } from 'src/shared/constants/portal-role-types';
import { isProtectedAdminEmail } from 'src/shared/constants/protected-admin';
import { ConfigService } from '@nestjs/config';
import { LoginActivityRecorder } from 'src/modules/login-activity/services/login-activity-recorder';
import { SessionRegistry } from 'src/modules/sessions/services/session-registry';
import { LoginPolicyEnforcer } from 'src/modules/security-policy/services/login-policy-enforcer';
import { SecurityPolicyService } from 'src/modules/security-policy/services/security-policy-service';
import { AuditLogRecorder } from 'src/modules/audit-logs/services/audit-log-recorder';
import { AccessControlSiteService } from 'src/modules/access-control/services/access-control-site-service';
import type { RequestContextDto } from 'src/shared/decorators/request-context-decorator';
import {
  RoleType,
  UserRequestKind,
  UserRequestStatus,
  type AuditSeverity,
} from 'src/infastructures/prisma/common/client';
import { RegistrationStatusTokens } from './registration-status-tokens';
import type { RegistrationReviewKind } from '../repositories/auth-repository';

/** Public status page wording. */
const REGISTRATION_STATUS_LABELS: Record<RegistrationReviewKind, string> = {
  [UserRequestKind.BENEFICIARY_REGISTRATION]: 'beneficiary',
  [UserRequestKind.ALUMNI_REGISTRATION]: 'alumni volunteer',
  [UserRequestKind.PARTNER_BARANGAY_REGISTRATION]: 'partner barangay volunteer',
  [UserRequestKind.MANUAL_REGISTRATION]: 'manual volunteer',
};
import { portalUrl as resolvePortalUrl } from 'src/shared/utils/environment-utils';

/** Min gap between temporary-password mails per address. */
const RESET_COOLDOWN = DurationUtils.ONE_MINUTE * 2;

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
    private readonly securityPolicyService: SecurityPolicyService,
    private readonly registrationStatusTokens: RegistrationStatusTokens,
  ) {}

  /** Bad links are 400, not 401 (401 ends the portal session). Recycled requests still read as under review. */
  async getRegistrationStatus(
    token: string,
  ): Promise<RegistrationStatusResponseDto> {
    const userRequestId = this.registrationStatusTokens.verify(token);
    if (!userRequestId) {
      throw new BadRequestException(
        'This status link is invalid or has expired',
      );
    }

    const row = await this.authRepository.findRegistrationStatus(userRequestId);
    if (!row) {
      throw new NotFoundException('This registration could not be found');
    }

    const status =
      row.status === UserRequestStatus.ACCEPTED
        ? 'ACCEPTED'
        : row.status === UserRequestStatus.REJECTED
          ? 'REJECTED'
          : 'PENDING';
    return {
      reference: `REQ-${String(row.reference_number).padStart(3, '0')}`,
      registration_label:
        REGISTRATION_STATUS_LABELS[row.kind as RegistrationReviewKind],
      firstname: row.user.firstname,
      status,
      rejection_reason:
        status === 'REJECTED' ? (row.rejection_reason ?? null) : null,
      submitted_at: row.createdAt.toISOString(),
      decided_at:
        status === 'PENDING' ? null : (row.decided_at?.toISOString() ?? null),
    };
  }

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

    // Checked before lookup: these refuse the attempt regardless of the email.
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

    // Social-only accounts: same reply as a wrong password.
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
        // Valid credentials without a portal role warrant review.
        severity: 'WARNING',
        description: `Portal sign-in refused for ${email} — not a portal role`,
        reason: message,
        userId: account.user.user_id,
        roleType: account.user.role.type,
      });
      throw new ForbiddenException(message);
    }

    // Provisioned credentials expire; admins re-issue rather than recreate.
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

    // Makes the token revocable (`SessionGuard`).
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

  /** Ends only this device's session. */
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

  /** Audit entry beside `LoginActivity`; actor taken from the submitted email (no token yet). */
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
      // No token at sign-in; an unmatched email is recorded as the system.
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

  /** Replaces the password with a mailed temporary one, changed later in Settings. */
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

    // Refuse within the cooldown, so a second click can't overwrite the mailed password.
    const cooldownKey = this.resetCooldownKey(normalizedEmail);
    if (await this.redisService.get<string>(cooldownKey)) {
      const remaining = await this.redisService.ttl(cooldownKey);
      const seconds = remaining > 0 ? remaining : RESET_COOLDOWN;
      throw new HttpException(
        `A temporary password was sent recently. Please wait ${seconds} seconds before requesting another.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const policy = await this.securityPolicyService.getPolicy();
    const temporaryPassword = generateTemporaryPassword(policy);
    await this.loginPolicyEnforcer.assertPasswordMeetsPolicy(temporaryPassword);
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    const portalUrl = resolvePortalUrl();

    const template = await TemplateUtils.compileTemplate(
      'portal-temporary-password.html',
      {
        username: account.user.firstname || normalizedEmail,
        email: normalizedEmail,
        temporaryPassword,
        portalUrl,
      },
    );

    // Mail before writing, so a failed delivery leaves the old password working.
    try {
      await this.nodemailerService.sendEmail(
        normalizedEmail,
        'Your temporary CARES portal password',
        template,
      );
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : 'Email delivery failed';
      throw new BadGatewayException(
        `Unable to send temporary password email. ${detail}`,
      );
    }

    await this.authRepository.updatePasswordByEmail(
      normalizedEmail,
      passwordHash,
    );
    await this.redisService.set(cooldownKey, 'sent', RESET_COOLDOWN);

    await this.auditLogRecorder.record({
      action: 'auth.portal.password-reset.requested',
      description: `Temporary password issued for ${normalizedEmail}`,
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
      retry_after_seconds: RESET_COOLDOWN,
    };
  }

  private resetCooldownKey(email: string): string {
    return `portal-password-reset:cooldown:${email}`;
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

  /** Relays the message and ID files to the support inbox; an admin provisions manually. */
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
    if (files.length === 0) {
      throw new BadRequestException(
        'Attach at least one ID document for verification',
      );
    }
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
