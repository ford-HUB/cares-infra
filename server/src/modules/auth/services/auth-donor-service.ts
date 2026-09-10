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

/** How long a verified profile stays claimable while the donor fills in the form. */
const TICKET_TTL_SECONDS = DurationUtils.THIRTY_MINUTES;

/**
 * Donor sign-in and sign-up through Google or Facebook.
 *
 * Split from `AuthMobileService` because almost nothing is shared with the volunteer
 * flow: a donor presents no ID and enrols no face, so the whole ID/OCR/face state
 * machine is absent here. The one thing borrowed is the email OTP — a donor who signs
 * up with a password (no provider to vouch for the address) goes through the same
 * `/v1/auth/send-verification` + `/v1/auth/verify-otp` pair as a volunteer, and
 * `registerDonorWithEmail` only reads the verified flag those calls leave in Redis.
 *
 * Verifying the provider token is not this service's job: `DonorOAuthGuard` runs the
 * matching Passport strategy first, and what arrives here is an already-verified profile.
 *
 * The exchange is two calls rather than one. The first verifies the provider token and,
 * for someone new, parks the verified profile in Redis under a ticket; the second spends
 * that ticket to create the donor. That way the phone number and address the form still
 * has to collect do not force the client to hold a provider token across two screens, and
 * a replayed registration call cannot invent an identity — the ticket is the only proof
 * accepted, and it is deleted the moment it is used.
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

    // Lockout and IP rules apply to a social sign-in exactly as they do to a password
    // one — the credential being a provider token changes nothing about who may sign in.
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

    // An account already on this email is the same person arriving by a new door: link
    // the identity rather than colliding on `Account.email`, which is unique.
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

  /**
   * Completes donor sign-up for a ticket handed out by `signInWithProvider`. The email
   * and provider identity come from the ticket, never from the request body — a client
   * may correct its own name, but it may not name a different account.
   */
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

    // Spent, whatever happens next — a ticket must not create a second donor.
    await this.redisService.delete(this.ticketKey(data.oauth_ticket));

    return this.issueSession(
      created.user_id,
      { email: ticket.email, ipAddress, userAgent, source: 'MOBILE' as const },
      ipAddress,
      userAgent,
    );
  }

  /**
   * Completes email + password donor sign-up. The email must already be OTP-verified
   * (`AuthMobileService.verifyOtpEmail`) — the flag it sets is the only proof accepted,
   * and it is cleared here so the same code cannot open a second account.
   */
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

  /** Opens a revocable session for a user resolved by a provider rather than a password. */
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

    if (user.is_restricted) {
      const message = user.restriction_reason
        ? `Account restricted: ${user.restriction_reason}`
        : 'This account has been restricted by an administrator';
      await this.loginActivityRecorder.record({
        ...attempt,
        userId,
        outcome: 'RESTRICTED_ACCOUNT',
        failureReason: message,
      });
      throw new ForbiddenException(message);
    }

    const email = user.accounts[0]?.email ?? attempt.email;

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

  // Mirror `AuthMobileService.otpKey` / `otpVerifiedKey` — the OTP is issued there.
  private otpKey(email: string): string {
    return `otp:${email}`;
  }

  private otpVerifiedKey(email: string): string {
    return `otp-verified:${email}`;
  }
}
