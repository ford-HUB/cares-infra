import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard, IAuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import type { AuthProvider } from '../../prisma/common/client';
import { FACEBOOK_IDENTITY_STRATEGY_NAME } from '../strategies/facebook-identity-strategy';
import { GOOGLE_IDENTITY_STRATEGY_NAME } from '../strategies/google-identity-strategy';

/**
 * Builds the guard for one identity strategy.
 *
 * The `handleRequest` override exists because `passport-jwt` reports every rejection the
 * same way — `user: false` plus an `info` error — which would otherwise reach the donor
 * as a bare "Unauthorized". Mapping `info` back to a cause is the difference between
 * "try again" and "your session expired, tap the button again".
 */
function buildProviderGuard(
  strategyName: string,
  providerLabel: string,
): IAuthGuard {
  class ProviderIdentityGuard extends AuthGuard(strategyName) {
    handleRequest<TUser = unknown>(
      error: Error | null,
      user: TUser | false,
      info: unknown,
    ): TUser {
      // A strategy that threw on purpose — "not configured", "wrong app" — already
      // carries the right status and wording, so it passes straight through.
      if (error) {
        throw error;
      }

      if (!user) {
        throw new UnauthorizedException(describeFailure(providerLabel, info));
      }

      return user;
    }
  }

  return new ProviderIdentityGuard();
}

function describeFailure(providerLabel: string, info: unknown): string {
  const name = info instanceof Error ? info.name : '';
  const message = info instanceof Error ? info.message : '';

  if (name === 'TokenExpiredError') {
    return `This ${providerLabel} sign-in has expired. Please try again.`;
  }

  // jsonwebtoken words these as "jwt audience invalid" / "jwt issuer invalid".
  if (message.includes('audience')) {
    return `This ${providerLabel} token was issued for a different application`;
  }
  if (message.includes('issuer')) {
    return `This token was not issued by ${providerLabel}`;
  }
  if (message.includes('No auth token')) {
    return `No ${providerLabel} sign-in token was provided`;
  }

  return `${providerLabel} rejected this sign-in token`;
}

/**
 * One guard instance per provider, built once at module load — they hold no per-request
 * state, and rebuilding a mixin class on every call would be waste.
 */
const GUARD_BY_PROVIDER = {
  GOOGLE: buildProviderGuard(GOOGLE_IDENTITY_STRATEGY_NAME, 'Google'),
  FACEBOOK: buildProviderGuard(FACEBOOK_IDENTITY_STRATEGY_NAME, 'Facebook'),
} satisfies Record<AuthProvider, IAuthGuard>;

/**
 * Runs whichever identity strategy the posted `provider` names, so donors keep a single
 * sign-in endpoint instead of one route per provider.
 *
 * Guards run before pipes, so this reads the raw body — `provider` is validated here
 * rather than waiting for `DonorOAuthSchema`, and an unknown value is refused before any
 * provider is contacted.
 */
@Injectable()
export class DonorOAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const provider = (request.body as { provider?: unknown } | undefined)
      ?.provider;

    const guard =
      typeof provider === 'string'
        ? GUARD_BY_PROVIDER[provider as AuthProvider]
        : undefined;

    if (!guard) {
      throw new BadRequestException(
        `provider must be one of: ${Object.keys(GUARD_BY_PROVIDER).join(', ')}`,
      );
    }

    return (await guard.canActivate(context)) as boolean;
  }
}
