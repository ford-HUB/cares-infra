/**
 * The server's `PermissionKey` values the portal gates its own screens on. Kept as
 * literals rather than a shared enum so the site never imports from `server/`; the
 * catalog endpoint remains the source of truth for what each key means.
 *
 * The `*_VIEW` keys decide whether a module shows in the sidebar and whether its
 * URL opens. The rest are the actions inside a screen — a button or menu item is
 * rendered only while the account holds the matching right.
 */
export const PORTAL_PERMISSION = {
  USERS_VIEW: 'USERS_VIEW',
  USERS_RESTRICT: 'USERS_RESTRICT',
  USERS_BLOCK_IP: 'USERS_BLOCK_IP',
  USERS_EXPORT: 'USERS_EXPORT',
  ACCESS_CONTROL_VIEW: 'ACCESS_CONTROL_VIEW',
  ACCESS_CONTROL_MANAGE: 'ACCESS_CONTROL_MANAGE',
  EVENTS_VIEW: 'EVENTS_VIEW',
  EVENTS_CREATE: 'EVENTS_CREATE',
  EVENTS_UPDATE: 'EVENTS_UPDATE',
  EVENTS_DELETE: 'EVENTS_DELETE',
  EVENTS_PUBLISH: 'EVENTS_PUBLISH',
  ATTENDANCE_VIEW: 'ATTENDANCE_VIEW',
  ATTENDANCE_RECORD: 'ATTENDANCE_RECORD',
  ATTENDANCE_EXPORT: 'ATTENDANCE_EXPORT',
  CERTIFICATES_VIEW: 'CERTIFICATES_VIEW',
  CERTIFICATES_TEMPLATE_MANAGE: 'CERTIFICATES_TEMPLATE_MANAGE',
  CERTIFICATES_ISSUE: 'CERTIFICATES_ISSUE',
  DONATIONS_VIEW: 'DONATIONS_VIEW',
  DONATIONS_RECORD: 'DONATIONS_RECORD',
  REPORTS_VIEW: 'REPORTS_VIEW',
  REPORTS_PUBLISH: 'REPORTS_PUBLISH',
  SECURITY_AUDIT_VIEW: 'SECURITY_AUDIT_VIEW',
  SECURITY_SESSION_REVOKE: 'SECURITY_SESSION_REVOKE',
  SECURITY_POLICY_MANAGE: 'SECURITY_POLICY_MANAGE',
  SYSTEM_PERFORMANCE_VIEW: 'SYSTEM_PERFORMANCE_VIEW',
  SYSTEM_NOTICE_MANAGE: 'SYSTEM_NOTICE_MANAGE',
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
