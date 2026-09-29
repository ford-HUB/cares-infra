import type { ConfigService } from '@nestjs/config';

/**
 * The root operator account. It is the one login that must never be locked out of the
 * portal, so it cannot have its actions suspended and cannot change the email it signs
 * in with — either would risk leaving the system with no reachable administrator.
 *
 * Override with `PROTECTED_ADMIN_EMAIL` in `server/.env` if the root account differs.
 */
export const DEFAULT_PROTECTED_ADMIN_EMAIL = 'admin@cares.com';

export function getProtectedAdminEmail(configService: ConfigService): string {
  const configured = configService
    .get<string>('PROTECTED_ADMIN_EMAIL')
    ?.trim()
    .toLowerCase();

  return configured || DEFAULT_PROTECTED_ADMIN_EMAIL;
}

export function isProtectedAdminEmail(
  email: string | null | undefined,
  configService: ConfigService,
): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === getProtectedAdminEmail(configService);
}
