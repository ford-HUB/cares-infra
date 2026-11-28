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

/** Cached by `jwks-rsa`. */
const GOOGLE_JWKS_URI = 'https://www.googleapis.com/oauth2/v3/certs';

/** Google mints tokens under both spellings; both are legitimate. */
const ALLOWED_ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];

interface GoogleIdTokenClaims {
  sub?: string;
  email?: string;
  email_verified?: boolean | string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

/** Verifies the native-login ID token locally against JWKS: RS256, `iss`, `exp` and `audience`. */
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

  /** Already verified; claim mapping only. */
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

/** Android, iOS and web (`serverClientId`) client ids; an empty list throws. */
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
