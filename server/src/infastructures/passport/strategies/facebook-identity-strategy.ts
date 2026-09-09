import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-custom';
import {
  OAuthIdentityProfile,
  normalizeName,
  readPostedToken,
} from '../oauth-identity';

export const FACEBOOK_IDENTITY_STRATEGY_NAME = 'facebook-identity';

const GRAPH_VERSION = 'v21.0';
const GRAPH_BASE_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;

const PROFILE_FIELDS = [
  'id',
  'email',
  'first_name',
  'middle_name',
  'last_name',
  'picture.type(large)',
].join(',');

interface FacebookDebugTokenResponse {
  data?: {
    app_id?: string;
    is_valid?: boolean;
    expires_at?: number;
    error?: { message?: string };
  };
  error?: { message?: string };
}

interface FacebookProfileResponse {
  id?: string;
  email?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  picture?: { data?: { url?: string; is_silhouette?: boolean } };
  error?: { message?: string };
}

/**
 * Signs a donor in from the access token Facebook Login handed the mobile app.
 *
 * A custom strategy rather than `passport-facebook` for the same reason as its Google
 * counterpart: consent already happened natively on the phone, so there is no redirect
 * leg — only a token to verify.
 *
 * Facebook has no ID token to check offline, so verification is two calls: `debug_token`
 * proves the token is live *and was minted for this app* — without that check any valid
 * Facebook token from any app would sign someone in — and `/me` then reads the profile.
 *
 * The app id and secret are read per call rather than in the constructor so the server
 * still boots with Facebook unconfigured; only a Facebook sign-in fails, and it fails
 * with a message saying so.
 */
@Injectable()
export class FacebookIdentityStrategy extends PassportStrategy(
  Strategy,
  FACEBOOK_IDENTITY_STRATEGY_NAME,
) {
  private get appId(): string {
    return process.env.FACEBOOK_APP_ID?.trim() ?? '';
  }

  private get appSecret(): string {
    return process.env.FACEBOOK_APP_SECRET?.trim() ?? '';
  }

  async validate(request: Request): Promise<OAuthIdentityProfile> {
    const accessToken = readPostedToken(request.body);
    if (!accessToken) {
      throw new UnauthorizedException('No Facebook sign-in token was provided');
    }

    if (!this.appId || !this.appSecret) {
      throw new ServiceUnavailableException(
        'Facebook sign-in is not configured yet. Set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET in server/.env.',
      );
    }

    await this.assertTokenBelongsToThisApp(accessToken);

    const profile = await this.graphRequest<FacebookProfileResponse>(
      `${GRAPH_BASE_URL}/me?fields=${encodeURIComponent(PROFILE_FIELDS)}&access_token=${encodeURIComponent(accessToken)}`,
      'read your Facebook profile',
    );

    if (!profile.id) {
      throw new UnauthorizedException('Facebook did not return an account id');
    }

    const email = profile.email?.trim().toLowerCase() ?? '';
    if (!email) {
      throw new UnauthorizedException(
        'Your Facebook account did not share an email address. Grant the email permission, or sign up with your email instead.',
      );
    }

    const picture = profile.picture?.data;

    return {
      providerUserId: profile.id,
      email,
      // The Graph API exposes no verification flag, and Facebook only returns an address
      // it has confirmed — treating it as verified here matches what the API can tell us.
      emailVerified: true,
      firstname: normalizeName(profile.first_name),
      middleName: normalizeName(profile.middle_name),
      lastname: normalizeName(profile.last_name),
      avatar: picture?.is_silhouette ? null : (picture?.url?.trim() ?? null),
    };
  }

  /** Rejects a token that is expired, revoked, or minted for a different Facebook app. */
  private async assertTokenBelongsToThisApp(
    accessToken: string,
  ): Promise<void> {
    const appAccessToken = `${this.appId}|${this.appSecret}`;
    const debug = await this.graphRequest<FacebookDebugTokenResponse>(
      `${GRAPH_BASE_URL}/debug_token?input_token=${encodeURIComponent(accessToken)}&access_token=${encodeURIComponent(appAccessToken)}`,
      'verify your Facebook sign-in',
    );

    const data = debug.data;
    if (!data?.is_valid) {
      throw new UnauthorizedException(
        data?.error?.message ?? 'Facebook rejected this sign-in token',
      );
    }

    if (data.app_id !== this.appId) {
      throw new UnauthorizedException(
        'This Facebook token was issued for a different application',
      );
    }

    // `expires_at` is 0 for tokens that do not expire.
    if (data.expires_at && data.expires_at * 1000 <= Date.now()) {
      throw new UnauthorizedException(
        'This Facebook sign-in has expired. Please try again.',
      );
    }
  }

  private async graphRequest<T extends { error?: { message?: string } }>(
    url: string,
    action: string,
  ): Promise<T> {
    let payload: T;
    let ok: boolean;

    try {
      const response = await fetch(url);
      ok = response.ok;
      payload = (await response.json()) as T;
    } catch {
      throw new ServiceUnavailableException(
        `Could not reach Facebook to ${action}. Please try again shortly.`,
      );
    }

    if (!ok || payload.error) {
      throw new UnauthorizedException(
        payload.error?.message ?? `Facebook refused to ${action}`,
      );
    }

    return payload;
  }
}
