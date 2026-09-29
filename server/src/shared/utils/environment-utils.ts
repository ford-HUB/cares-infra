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

/**
 * Origins allowed by CORS for REST and the socket gateways: PRODUCTION_ORIGIN in
 * production, DEVELOPMENT_ORIGIN otherwise.
 */
export function allowedOrigins(): string[] {
  return isProduction()
    ? parseOrigins(process.env.PRODUCTION_ORIGIN)
    : parseOrigins(process.env.DEVELOPMENT_ORIGIN);
}

function withoutTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

/**
 * The staff portal's base URL, used for links in outgoing mail. SITE_URL wins when
 * set; otherwise it is the first allowed origin for the current environment.
 */
export function portalUrl(): string {
  return withoutTrailingSlash(
    process.env.SITE_URL?.trim() || (allowedOrigins()[0] ?? ''),
  );
}

/**
 * The API's publicly reachable base URL, used for OAuth callbacks and payment
 * webhooks. Development falls back to this machine; production must set
 * API_PUBLIC_URL since a local address is unreachable from outside.
 */
export function apiPublicUrl(): string {
  return withoutTrailingSlash(
    process.env.API_PUBLIC_URL?.trim() ||
      (isProduction() ? '' : `http://localhost:${process.env.PORT ?? 3000}`),
  );
}
