/**
 * The server's `PermissionKey` values the portal gates its own screens on. Kept as
 * literals rather than a shared enum so the site never imports from `server/`; the
 * catalog endpoint remains the source of truth for what each key means.
 *
 * Only the "can see this module" keys are listed — the finer-grained action keys
 * (create / delete / export) are enforced inside each screen, not in the nav.
 */
export const PORTAL_PERMISSION = {
  USERS_VIEW: 'USERS_VIEW',
  ACCESS_CONTROL_VIEW: 'ACCESS_CONTROL_VIEW',
  EVENTS_VIEW: 'EVENTS_VIEW',
  ATTENDANCE_VIEW: 'ATTENDANCE_VIEW',
  CERTIFICATES_VIEW: 'CERTIFICATES_VIEW',
  DONATIONS_VIEW: 'DONATIONS_VIEW',
  REPORTS_VIEW: 'REPORTS_VIEW',
  SECURITY_AUDIT_VIEW: 'SECURITY_AUDIT_VIEW',
  SECURITY_SESSION_REVOKE: 'SECURITY_SESSION_REVOKE',
  SECURITY_POLICY_MANAGE: 'SECURITY_POLICY_MANAGE',
  SYSTEM_PERFORMANCE_VIEW: 'SYSTEM_PERFORMANCE_VIEW',
  SYSTEM_SERVICE_MANAGE: 'SYSTEM_SERVICE_MANAGE',
  SYSTEM_MAINTENANCE_MANAGE: 'SYSTEM_MAINTENANCE_MANAGE',
  CHAT_ACCESS: 'CHAT_ACCESS',
  MAIL_ACCESS: 'MAIL_ACCESS',
  SUPPORT_TICKET_MANAGE: 'SUPPORT_TICKET_MANAGE',
} as const

/**
 * How often the portal re-reads the session's rights while a tab is open, on top of
 * the re-read it does on every navigation and whenever the tab regains focus. Short
 * enough that an admin's change shows up while the person is still on the page.
 */
export const PERMISSION_SYNC_INTERVAL_MS = 30_000
