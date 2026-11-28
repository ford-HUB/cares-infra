const isProduction = import.meta.env.VITE_NODE_ENV === 'production'

export const API_BASE_URL: string = (
  (isProduction
    ? import.meta.env.VITE_PRODUCTION_ORIGIN
    : import.meta.env.VITE_DEVELOPMENT_ORIGIN) ?? ''
)
  .trim()
  .replace(/\/+$/, '')
