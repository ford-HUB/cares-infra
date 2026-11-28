/** Provider-agnostic identity placed on `req.user`. */
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

export function normalizeName(value: string | undefined | null): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

/** Fallback only when the provider gives no structured name. */
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

/** Read before pipes run. */
export function readPostedToken(body: unknown): string {
  const token =
    body && typeof body === 'object'
      ? (body as Record<string, unknown>).token
      : undefined;

  return typeof token === 'string' ? token.trim() : '';
}
