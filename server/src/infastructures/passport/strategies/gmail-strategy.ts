import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import { GMAIL_OAUTH_SCOPES } from '../../gmail/gmail-api-client';
import { apiPublicUrl } from '../../../shared/utils/environment-utils';

export const GMAIL_STRATEGY_NAME = 'gmail';

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

/** Links a mailbox only, never a portal sign-in. Verify arity 6 exposes `expires_in`. */
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
        `${apiPublicUrl()}/api/v1/mailbox/google/callback`,
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
