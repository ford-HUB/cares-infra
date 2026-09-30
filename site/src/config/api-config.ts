/**
 * Base URL of the CARES API, switched by VITE_NODE_ENV the same way the server
 * switches on NODE_ENV: "production" reads VITE_PRODUCTION_ORIGIN, anything else
 * reads VITE_DEVELOPMENT_ORIGIN.
 */
const isProduction = import.meta.env.VITE_NODE_ENV === 'production'

export const API_BASE_URL: string = (
  (isProduction
    ? import.meta.env.VITE_PRODUCTION_ORIGIN
    : import.meta.env.VITE_DEVELOPMENT_ORIGIN) ?? ''
)
  .trim()
  .replace(/\/+$/, '')
