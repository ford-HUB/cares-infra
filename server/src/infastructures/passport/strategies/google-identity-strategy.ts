import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { passportJwtSecret } from 'jwks-rsa';
import { ExtractJwt, Strategy } from 'passport-jwt';
import {
  OAuthIdentityProfile,
  normalizeName,
  splitDisplayName,
} from '../oauth-identity';

export const GOOGLE_IDENTITY_STRATEGY_NAME = 'google-identity';

/** Google's OpenID signing keys. `jwks-rsa` fetches these once and caches them. */
const GOOGLE_JWKS_URI = 'https://www.googleapis.com/oauth2/v3/certs';

/** Google mints tokens under both spellings; both are legitimate. */
const ALLOWED_ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];

/** The ID token claims the donor flow reads, once passport-jwt has verified the token. */
interface GoogleIdTokenClaims {
  sub?: string;
  email?: string;
  email_verified?: boolean | string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

/**
 * Signs a donor in from the ID token Google Sign-In handed the mobile app.
 *
 * `passport-jwt` rather than `passport-google-oauth20` because the phone has already
 * completed consent natively — there is no browser leg to redirect, only a signed token
 * to check. And rather than Google's `tokeninfo` endpoint, which is a debugging aid:
 * verifying locally against the cached JWKS costs no network round-trip per sign-in and
 * cannot be taken down or rate-limited out from under us.
 *
 * Everything that makes this an authentication check is declared in the options below and
 * enforced by `jsonwebtoken`, not by hand: RS256 signature against Google's published
 * keys, `iss`, `exp`, and — the one people forget — `audience`. Without the audience
 * check, an ID token minted for *any* Google app would sign someone in here.
 *
 * Unlike `GmailStrategy`, which links a mailbox and grants no access, a success here *is*
 * an authentication: it puts a verified identity on `req.user`.
 */
@Injectable()
export class GoogleIdentityStrategy extends PassportStrategy(
  Strategy,
  GOOGLE_IDENTITY_STRATEGY_NAME,
) {
  constructor() {
    super({
      // The mobile client posts the token in the request body, not as a bearer header.
      jwtFromRequest: ExtractJwt.fromBodyField('token'),
      secretOrKeyProvider: passportJwtSecret({
        jwksUri: GOOGLE_JWKS_URI,
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
      }),
      algorithms: ['RS256'],
      issuer: ALLOWED_ISSUERS,
      audience: resolveAllowedAudiences(),
      ignoreExpiration: false,
    });
  }

  /**
   * Reached only for a token that already passed every check above, so this is claim
   * mapping and nothing more — there is no verification left to do here.
   */
  validate(claims: GoogleIdTokenClaims): OAuthIdentityProfile {
    const fallback = splitDisplayName(claims.name ?? '');

    return {
      providerUserId: claims.sub ?? '',
      email: claims.email?.trim().toLowerCase() ?? '',
      emailVerified:
        claims.email_verified === true || claims.email_verified === 'true',
      firstname: normalizeName(claims.given_name) || fallback.firstname,
      middleName: fallback.middleName,
      lastname: normalizeName(claims.family_name) || fallback.lastname,
      avatar: claims.picture?.trim() || null,
    };
  }
}

/**
 * Every client id that may sign in: the Android and iOS clients mint the token, and the
 * web client id is what `serverClientId` puts in `aud` when the mobile app asks for an ID
 * token meant for this backend.
 *
 * Read once at construction because `audience` is a strategy option, not a per-request
 * decision — the same point `GmailStrategy` reads its own credentials. An empty list
 * would silently accept nothing, so it fails loudly instead.
 */
function resolveAllowedAudiences(): string[] {
  const audiences = [
    process.env.GOOGLE_MOBILE_CLIENT_ID,
    process.env.GOOGLE_ANDROID_CLIENT_ID,
    process.env.GOOGLE_IOS_CLIENT_ID,
    process.env.GOOGLE_CLIENT_ID,
  ]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  if (audiences.length === 0) {
    throw new Error(
      'Google donor sign-in needs at least one client id: set GOOGLE_MOBILE_CLIENT_ID in server/.env',
    );
  }

  return audiences;
}
