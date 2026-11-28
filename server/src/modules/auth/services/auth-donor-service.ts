import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { AuthProvider } from '../../../infastructures/prisma/common/client';
import type { OAuthIdentityProfile } from 'src/infastructures/passport/oauth-identity';
import { JwtService } from 'src/infastructures/jwt/jwt-service';
import { RedisService } from 'src/infastructures/redis/redis-service';
import { LoginActivityRecorder } from 'src/modules/login-activity/services/login-activity-recorder';
import { SessionRegistry } from 'src/modules/sessions/services/session-registry';
import { LoginPolicyEnforcer } from 'src/modules/security-policy/services/login-policy-enforcer';
import { DurationUtils } from '../../../shared/utils/duration-utils';
import {
  AuthRepository,
  registrationConflict,
} from '../repositories/auth-repository';
import type {
  DonorOAuthResponseDto,
  DonorOAuthTicketDto,
  RegisterDonorDto,
  RegisterDonorWithEmailDto,
} from '../dto/auth-donor-dto';
import type { LoginResponseDto } from '../dto/auth-mobile-dto';
import { RegistrationApprovalGate } from './registration-approval-gate';
import { unlockedRoles } from 'src/shared/utils/unlocked-roles';

/** How long a verified profile stays claimable. */
const TICKET_TTL_SECONDS = DurationUtils.THIRTY_MINUTES;

/**
 * Split from `AuthMobileService`: donors present no ID or face. Shares only the email OTP
 * (`registerDonorWithEmail` reads its Redis flag). `DonorOAuthGuard` already verified the
 * provider token. Two-step exchange: sign-in parks the profile under a single-use ticket
 * that registration spends, so the client needn't hold the provider token.
 */
@Injectable()
export class AuthDonorService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
    private readonly sessionRegistry: SessionRegistry,
    private readonly loginActivityRecorder: LoginActivityRecorder,
    private readonly loginPolicyEnforcer: LoginPolicyEnforcer,
    private readonly registrationApprovalGate: RegistrationApprovalGate,
  ) {}

  async signInWithProvider(
    provider: AuthProvider,
    profile: OAuthIdentityProfile,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<DonorOAuthResponseDto> {
    const attempt = {
      email: profile.email,
      ipAddress,
      userAgent,
      source: 'MOBILE' as const,
    };

    // Lockout and IP rules apply to social sign-ins too.
    await this.loginPolicyEnforcer.assertLoginAllowed(attempt);

    const identity = await this.authRepository.findOAuthIdentity(
      provider,
      profile.providerUserId,
    );

    if (identity) {
      const session = await this.issueSession(
        identity.user.user_id,
        attempt,
        ipAddress,
        userAgent,
      );
      return {
        status: 'signed_in',
        session,
        profile: null,
        oauth_ticket: null,
      };
    }

    // Same email: link the identity (`Account.email` is unique).
    const existingAccount = await this.authRepository.findUserByEmail(
      profile.email,
    );

    if (existingAccount) {
      await this.authRepository.linkOAuthIdentity(
        existingAccount.user.user_id,
        provider,
        profile.providerUserId,
        profile.email,
      );
      const session = await this.issueSession(
        existingAccount.user.user_id,
        attempt,
        ipAddress,
        userAgent,
      );
      return {
        status: 'signed_in',
        session,
        profile: null,
        oauth_ticket: null,
      };
    }

    const ticket = await this.storeTicket(provider, profile);

    return {
      status: 'registration_required',
      session: null,
      profile: {
        provider,
        email: profile.email,
        firstname: profile.firstname,
        middle_name: profile.middleName,
        lastname: profile.lastname,
        avatar: profile.avatar,
      },
      oauth_ticket: ticket,
    };
  }

  /** Email and identity come from the ticket, never the body. */
  async registerDonor(
    data: RegisterDonorDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<LoginResponseDto> {
    const ticket = await this.redisService.get<DonorOAuthTicketDto>(
      this.ticketKey(data.oauth_ticket),
    );

    if (!ticket) {
      throw new UnauthorizedException(
        'This sign-up link has expired. Please tap the provider button again.',
      );
    }

    const existingAccount = await this.authRepository.findUserByEmail(
      ticket.email,
    );
    if (existingAccount) {
      throw registrationConflict('email');
    }

    const phoneNumber = data.phone_number.trim();
    const phoneOwner =
      await this.authRepository.findPhoneNumberOwner(phoneNumber);
    if (phoneOwner) {
      throw registrationConflict('phone_number');
    }

    const created = await this.authRepository.createDonorFromOAuth({
      firstname: data.firstname,
      lastname: data.lastname,
      middleName: data.middle_name,
      gender: data.gender,
      phoneNumber,
      currentAddress: data.current_address,
      avatar: ticket.avatar,
      email: ticket.email,
      provider: ticket.provider,
      providerUserId: ticket.providerUserId,
    });

    // Spent regardless of outcome, so a ticket can't create two donors.
    await this.redisService.delete(this.ticketKey(data.oauth_ticket));

    return this.issueSession(
      created.user_id,
      { email: ticket.email, ipAddress, userAgent, source: 'MOBILE' as const },
      ipAddress,
      userAgent,
    );
  }

  /** The OTP-verified flag is the only proof and is cleared here (one account per code). */
  async registerDonorWithEmail(
    data: RegisterDonorWithEmailDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<LoginResponseDto> {
    const email = data.email.trim().toLowerCase();

    const verified = await this.redisService.get<string>(
      this.otpVerifiedKey(email),
    );
    if (verified !== 'true') {
      throw new BadRequestException(
        'Email verification is required before registration',
      );
    }

    const existingAccount = await this.authRepository.findUserByEmail(email);
    if (existingAccount) {
      throw registrationConflict('email');
    }

    const phoneNumber = data.phone_number.trim();
    const phoneOwner =
      await this.authRepository.findPhoneNumberOwner(phoneNumber);
    if (phoneOwner) {
      throw registrationConflict('phone_number');
    }

    await this.loginPolicyEnforcer.assertPasswordMeetsPolicy(data.password);
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const created = await this.authRepository.createDonorWithPassword({
      firstname: data.firstname,
      lastname: data.lastname,
      middleName: data.middle_name,
      gender: data.gender,
      phoneNumber,
      currentAddress: data.current_address,
      email,
      hashedPassword,
    });

    await this.redisService.delete(this.otpKey(email));
    await this.redisService.delete(this.otpVerifiedKey(email));

    return this.issueSession(
      created.user_id,
      { email, ipAddress, userAgent, source: 'MOBILE' as const },
      ipAddress,
      userAgent,
    );
  }

  /** Revocable session for a provider-resolved user. */
  private async issueSession(
    userId: string,
    attempt: {
      email: string;
      ipAddress?: string;
      userAgent?: string;
      source: 'MOBILE';
    },
    ipAddress?: string,
    userAgent?: string,
  ): Promise<LoginResponseDto> {
    const user = await this.authRepository.findUserForSession(userId);
    if (!user) {
      throw new UnauthorizedException('This account is no longer available');
    }

    // Pending or refused approvals can't bypass via a social provider.
    await this.registrationApprovalGate.assertApproved(userId, attempt);

    const account = user.accounts[0];
    if (account?.is_restricted) {
      const message = account.restriction_reason
        ? `Account restricted: ${account.restriction_reason}`
        : 'This account has been restricted by an administrator';
      await this.loginActivityRecorder.record({
        ...attempt,
        userId,
        outcome: 'RESTRICTED_ACCOUNT',
        failureReason: message,
      });
      throw new ForbiddenException(message);
    }

    const email = account?.email ?? attempt.email;

    if (ipAddress) {
      await this.authRepository.recordLoginIp(userId, ipAddress);
    }

    await this.loginActivityRecorder.record({
      ...attempt,
      userId,
      outcome: 'SUCCESS',
    });

    const session = await this.sessionRegistry.create({
      userId,
      email,
      roleType: user.role.type,
      source: 'MOBILE',
      ipAddress,
      userAgent,
    });

    return {
      user_id: userId,
      role_type: user.role.type,
      email,
      firstname: user.firstname,
      has_interests: user.user_interest !== null,
      unlocked_roles: unlockedRoles({
        roleType: user.role.type,
        beneficiaryType: user.beneficiary_type,
      }),
      access_token: this.jwtService.sign({
        sub: userId,
        email,
        role_type: user.role.type,
        sid: session.session_id,
      }),
    };
  }

  private async storeTicket(
    provider: AuthProvider,
    profile: OAuthIdentityProfile,
  ): Promise<string> {
    const ticket = randomUUID();

    await this.redisService.set(
      this.ticketKey(ticket),
      {
        provider,
        providerUserId: profile.providerUserId,
        email: profile.email,
        firstname: profile.firstname,
        middleName: profile.middleName,
        lastname: profile.lastname,
        avatar: profile.avatar,
        createdAt: Date.now(),
      },
      TICKET_TTL_SECONDS,
    );

    return ticket;
  }

  private ticketKey(ticket: string): string {
    return `donor-oauth:${ticket}`;
  }

  // Must mirror `AuthMobileService.otpKey` / `otpVerifiedKey`.
  private otpKey(email: string): string {
    return `otp:${email}`;
  }

  private otpVerifiedKey(email: string): string {
    return `otp-verified:${email}`;
  }
}
