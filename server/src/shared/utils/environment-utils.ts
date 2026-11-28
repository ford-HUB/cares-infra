export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

function parseOrigins(value: string | undefined): string[] {
  return (
    value
      ?.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean) ?? []
  );
}

/** PRODUCTION_ORIGIN in production, DEVELOPMENT_ORIGIN otherwise. */
export function allowedOrigins(): string[] {
  return isProduction()
    ? parseOrigins(process.env.PRODUCTION_ORIGIN)
    : parseOrigins(process.env.DEVELOPMENT_ORIGIN);
}

function withoutTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

/** For mail links. SITE_URL, else the first allowed origin. */
export function portalUrl(): string {
  return withoutTrailingSlash(
    process.env.SITE_URL?.trim() || (allowedOrigins()[0] ?? ''),
  );
}

/** For OAuth callbacks and webhooks; production must set API_PUBLIC_URL. */
export function apiPublicUrl(): string {
  return withoutTrailingSlash(
    process.env.API_PUBLIC_URL?.trim() ||
      (isProduction() ? '' : `http://localhost:${process.env.PORT ?? 3000}`),
  );
}
