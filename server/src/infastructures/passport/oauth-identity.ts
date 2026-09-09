/**
 * Identity a provider vouched for, normalised so the donor flow never branches on
 * provider. This is what the identity strategies hang on `req.user`.
 */
export interface OAuthIdentityProfile {
  /** The provider's immutable subject id — `sub` for Google, `id` for Facebook. */
  providerUserId: string;
  email: string;
  /** Google reports this; Facebook only does for verified business accounts. */
  emailVerified: boolean;
  firstname: string;
  middleName: string;
  lastname: string;
  avatar: string | null;
}

/** Trims and collapses whitespace in a name a provider returned. */
export function normalizeName(value: string | undefined | null): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * Splits a provider's single display name into first / middle / last. Only used when a
 * provider gives no structured name — Google's `given_name`/`family_name` and
 * Facebook's `first_name`/`last_name` are preferred wherever they are present.
 */
export function splitDisplayName(displayName: string): {
  firstname: string;
  middleName: string;
  lastname: string;
} {
  const parts = normalizeName(displayName).split(' ').filter(Boolean);
  if (parts.length === 0) {
    return { firstname: '', middleName: '', lastname: '' };
  }
  if (parts.length === 1) {
    return { firstname: parts[0], middleName: '', lastname: '' };
  }

  return {
    firstname: parts[0],
    middleName: parts.slice(1, -1).join(' '),
    lastname: parts[parts.length - 1],
  };
}

/** Pulls the provider token a mobile client posted, before any pipe has run. */
export function readPostedToken(body: unknown): string {
  const token =
    body && typeof body === 'object'
      ? (body as Record<string, unknown>).token
      : undefined;

  return typeof token === 'string' ? token.trim() : '';
}
