/**
 * Base URL of the CARES API. `vite build` (production) reads VITE_PRODUCTION_ORIGIN;
 * `vite` dev reads VITE_DEVELOPMENT_ORIGIN — the same split the server uses.
 */
export const API_BASE_URL: string = (
  import.meta.env.PROD
    ? import.meta.env.VITE_PRODUCTION_ORIGIN
    : import.meta.env.VITE_DEVELOPMENT_ORIGIN
)?.trim() ?? ''
