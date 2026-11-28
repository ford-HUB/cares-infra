import type { ConfigService } from '@nestjs/config';

/** Root operator: can't be suspended or change its email. Override with `PROTECTED_ADMIN_EMAIL`. */
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
