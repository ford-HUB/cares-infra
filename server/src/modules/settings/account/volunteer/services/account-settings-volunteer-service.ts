import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomInt, randomUUID } from 'crypto';
import { JwtService } from '../../../../../infastructures/jwt/jwt-service';
import { NodemailerService } from '../../../../../infastructures/nodemailer/nodemailer-service';
import type { RoleType } from '../../../../../infastructures/prisma/common/client';
import { RedisService } from '../../../../../infastructures/redis/redis-service';
import type { JwtPayload } from '../../../../../shared/types/jwt-payload';
import { DurationUtils } from '../../../../../shared/utils/duration-utils';
import { TemplateUtils } from '../../../../../shared/utils/templete-utils';
import { ProfileCacheService } from '../../../../profile/services/profile-cache-service';
import { MOBILE_PROFILE_ROLE_TYPES } from '../../../../profile/validators/profile-mobile-validator';
import { LoginPolicyEnforcer } from '../../../../security-policy/services/login-policy-enforcer';
import {
  SessionRegistry,
  type SessionRecord,
} from '../../../../sessions/services/session-registry';
import { AccountSettingsRepository } from '../../repositories/account-settings-repository';
import type {
  ChangeEmailDto,
  ChangeEmailResponseDto,
  ChangePasswordDto,
  ChangePasswordResponseDto,
  OwnSessionDto,
  OwnSessionsResponseDto,
  RevokeOwnSessionsResponseDto,
  SendEmailChangeOtpResponseDto,
  VerifyEmailChangeOtpResponseDto,
} from '../dto/account-settings-volunteer-dto';

const EMAIL_CHANGE_MAX_ATTEMPTS = 5;

function isMobileRole(role: RoleType): boolean {
  return (MOBILE_PROFILE_ROLE_TYPES as readonly RoleType[]).includes(role);
}

/** Email change needs a code sent to the current address; password change needs the current password. Both end other devices. */
@Injectable()
export class AccountSettingsVolunteerService {
  constructor(
    private readonly accountSettingsRepository: AccountSettingsRepository,
    private readonly redisService: RedisService,
    private readonly nodemailerService: NodemailerService,
    private readonly jwtService: JwtService,
    private readonly sessionRegistry: SessionRegistry,
    private readonly profileCacheService: ProfileCacheService,
    private readonly loginPolicyEnforcer: LoginPolicyEnforcer,
  ) {}

  async sendEmailChangeOtp(
    caller: JwtPayload,
  ): Promise<SendEmailChangeOtpResponseDto> {
    const account = await this.requireAccount(caller.sub);

    // Social-only emails belong to the provider identity.
    if (!account.password) {
      throw new BadRequestException(
        'This account signs in through Google or Facebook. Its email is managed by that provider.',
      );
    }

    const existing = await this.redisService.get<string>(
      this.otpKey(caller.sub),
    );
    if (existing) {
      const ttl = await this.redisService.ttl(this.otpKey(caller.sub));
      return {
        email: account.email,
        sent: false,
        reused: true,
        expiresInSeconds: ttl > 0 ? ttl : 0,
      };
    }

    const otp = randomInt(100000, 1000000).toString();
    const template = await TemplateUtils.compileTemplate(
      'email-change-otp.html',
      {
        code: otp,
        username: account.user.firstname || account.email,
        expiresInMinutes: DurationUtils.TEN_MINUTES / 60,
      },
    );

    try {
      await this.nodemailerService.sendEmail(
        account.email,
        'Confirm your CARES email change',
        template,
      );
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : 'Email delivery failed';
      throw new BadGatewayException(`Unable to send the code. ${detail}`);
    }

    await this.clearEmailChangeState(caller.sub);
    await this.redisService.set(
      this.otpKey(caller.sub),
      otp,
      DurationUtils.TEN_MINUTES,
    );

    return {
      email: account.email,
      sent: true,
      reused: false,
      expiresInSeconds: DurationUtils.TEN_MINUTES,
    };
  }

  /** Spends the code for a single-use change token. */
  async verifyEmailChangeOtp(
    caller: JwtPayload,
    otp: string,
  ): Promise<VerifyEmailChangeOtpResponseDto> {
    const stored = await this.redisService.get<string>(this.otpKey(caller.sub));
    if (!stored) {
      throw new BadRequestException(
        'Code expired or not found. Please send a new code.',
      );
    }

    if (stored !== otp.trim()) {
      const attempts = await this.recordFailedAttempt(caller.sub);
      if (attempts >= EMAIL_CHANGE_MAX_ATTEMPTS) {
        await this.clearEmailChangeState(caller.sub);
        throw new BadRequestException(
          'Too many incorrect codes. Please send a new one.',
        );
      }
      throw new BadRequestException('Invalid code');
    }

    const changeToken = randomUUID();
    await this.redisService.delete(this.otpKey(caller.sub));
    await this.redisService.delete(this.attemptsKey(caller.sub));
    await this.redisService.set(
      this.tokenKey(caller.sub),
      changeToken,
      DurationUtils.FIFTEEN_MINUTES,
    );

    return { changeToken, expiresInSeconds: DurationUtils.FIFTEEN_MINUTES };
  }

  /** Then re-signs the caller's token. */
  async changeEmail(
    caller: JwtPayload,
    data: ChangeEmailDto,
  ): Promise<ChangeEmailResponseDto> {
    const storedToken = await this.redisService.get<string>(
      this.tokenKey(caller.sub),
    );
    if (!storedToken || storedToken !== data.change_token) {
      throw new UnauthorizedException(
        'This email change session expired. Please start again.',
      );
    }

    const account = await this.requireAccount(caller.sub);

    if (data.new_email === account.email) {
      throw new ConflictException(
        'New email must be different from your current email',
      );
    }

    const taken = await this.accountSettingsRepository.findAccountByEmail(
      data.new_email,
    );
    if (taken) {
      throw new ConflictException('Email is already in use');
    }

    const updated = await this.accountSettingsRepository.updateEmail(
      account.account_id,
      data.new_email,
    );

    await this.clearEmailChangeState(caller.sub);
    await this.profileCacheService.invalidateProfile(caller.sub);

    // Others hold old-address tokens; the caller gets a re-signed one.
    await this.sessionRegistry.revokeAllForUser(caller.sub, caller.sid);
    await this.sessionRegistry.updateEmailForUser(caller.sub, updated.email);

    return {
      email: updated.email,
      access_token: this.jwtService.sign({
        sub: caller.sub,
        email: updated.email,
        role_type: account.user.role.type,
        sid: caller.sid,
      }),
    };
  }

  async changePassword(
    caller: JwtPayload,
    data: ChangePasswordDto,
  ): Promise<ChangePasswordResponseDto> {
    const account = await this.requireAccount(caller.sub);

    // Social-only accounts have no password.
    if (!account.password) {
      throw new BadRequestException(
        'This account signs in through Google or Facebook and has no password to change.',
      );
    }

    const matches = await bcrypt
      .compare(data.current_password, account.password)
      .catch(() => false);
    if (!matches) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    await this.loginPolicyEnforcer.assertPasswordMeetsPolicy(data.new_password);

    const reused = await bcrypt
      .compare(data.new_password, account.password)
      .catch(() => false);
    if (reused) {
      throw new BadRequestException(
        'Your new password must be different from your current one',
      );
    }

    const hashedPassword = await bcrypt.hash(data.new_password, 10);
    await this.accountSettingsRepository.updatePassword(
      account.account_id,
      hashedPassword,
    );

    const revoked = await this.sessionRegistry.revokeAllForUser(
      caller.sub,
      caller.sid,
    );

    return { updated: true, revoked_sessions: revoked };
  }

  async listOwnSessions(caller: JwtPayload): Promise<OwnSessionsResponseDto> {
    const owned = await this.ownedSessions(caller.sub);
    return {
      items: owned.map((session) => toOwnSession(session, caller.sid)),
    };
  }

  async revokeOwnSession(
    caller: JwtPayload,
    sessionId: string,
  ): Promise<RevokeOwnSessionsResponseDto> {
    if (sessionId === caller.sid) {
      throw new ForbiddenException('Use sign out to end the device you are on');
    }

    const session = await this.sessionRegistry.find(sessionId);
    if (!session || session.user_id !== caller.sub) {
      // Same reply for "not yours" and "gone".
      throw new NotFoundException('That device has already been signed out');
    }

    await this.sessionRegistry.revoke(sessionId);
    return { revoked: 1 };
  }

  async revokeOtherSessions(
    caller: JwtPayload,
  ): Promise<RevokeOwnSessionsResponseDto> {
    const revoked = await this.sessionRegistry.revokeAllForUser(
      caller.sub,
      caller.sid,
    );
    return { revoked };
  }

  private async requireAccount(userId: string) {
    const account =
      await this.accountSettingsRepository.findAccountByUserId(userId);
    if (!account || !isMobileRole(account.user.role.type)) {
      throw new UnauthorizedException('Account not found');
    }
    return account;
  }

  private async ownedSessions(userId: string): Promise<SessionRecord[]> {
    return (await this.sessionRegistry.listAll()).filter(
      (session) => session.user_id === userId,
    );
  }

  private otpKey(userId: string): string {
    return `email-change:otp:${userId}`;
  }

  private tokenKey(userId: string): string {
    return `email-change:token:${userId}`;
  }

  private attemptsKey(userId: string): string {
    return `email-change:attempts:${userId}`;
  }

  /** Lives as long as the code. */
  private async recordFailedAttempt(userId: string): Promise<number> {
    const key = this.attemptsKey(userId);
    const next = ((await this.redisService.get<number>(key)) ?? 0) + 1;
    await this.redisService.set(key, next, DurationUtils.TEN_MINUTES);
    return next;
  }

  private async clearEmailChangeState(userId: string): Promise<void> {
    await this.redisService.delete(this.otpKey(userId));
    await this.redisService.delete(this.tokenKey(userId));
    await this.redisService.delete(this.attemptsKey(userId));
  }
}

function toOwnSession(
  session: SessionRecord,
  currentSessionId: string | undefined,
): OwnSessionDto {
  return {
    session_id: session.session_id,
    source: session.source,
    ip_address: session.ip_address,
    user_agent: session.user_agent,
    created_at: session.created_at,
    last_seen_at: session.last_seen_at,
    expires_at: session.expires_at,
    is_current: session.session_id === currentSessionId,
  };
}
