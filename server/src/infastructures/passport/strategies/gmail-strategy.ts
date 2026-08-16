import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import { GMAIL_OAUTH_SCOPES } from '../../gmail/gmail-api-client';

export const GMAIL_STRATEGY_NAME = 'gmail';

/** What Google hands back after consent, normalised for the mailbox service. */
export interface GmailOAuthResult {
  google_sub: string;
  email: string;
  scope: string;
  access_token: string;
  /** Google only returns this on first consent, or when `prompt=consent` is forced. */
  refresh_token?: string;
  expires_in: number;
}

interface GoogleTokenParams {
  expires_in?: number;
  scope?: string;
}

const DEFAULT_ACCESS_TOKEN_TTL_SECONDS = 3600;

/**
 * Links a portal user's Google mailbox — this is **not** a portal sign-in strategy.
 * Portal authentication stays with the JWT in `infastructures/jwt`; a Google identity
 * on its own never grants access to CARES.
 *
 * `true` as the third argument widens the verify arity to 6 so passport-oauth2 hands us
 * the raw token params, which is where `expires_in` lives.
 */
@Injectable()
export class GmailStrategy extends PassportStrategy(
  Strategy,
  GMAIL_STRATEGY_NAME,
  true,
) {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_SECRET ?? '',
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ??
        'http://localhost:8000/api/v1/mailbox/google/callback',
      scope: GMAIL_OAUTH_SCOPES,
      passReqToCallback: true,
    });
  }

  validate(
    _request: unknown,
    accessToken: string,
    refreshToken: string | undefined,
    params: GoogleTokenParams,
    profile: Profile,
  ): GmailOAuthResult {
    return {
      google_sub: profile.id,
      email: profile.emails?.[0]?.value ?? '',
      scope: params.scope ?? GMAIL_OAUTH_SCOPES.join(' '),
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: params.expires_in ?? DEFAULT_ACCESS_TOKEN_TTL_SECONDS,
    };
  }
}
