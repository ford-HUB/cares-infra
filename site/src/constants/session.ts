export const SESSION_KEY = 'cares-admin-session'
export const TOKEN_KEY = 'cares-admin-token'

/**
 * Fired on `window` by the API client when the server refuses a token it previously
 * accepted — the session was revoked (an administrator restricted the account or
 * signed the device out) or it expired. The auth store listens and signs the tab out.
 */
export const SESSION_ENDED_EVENT = 'cares:session-ended'
