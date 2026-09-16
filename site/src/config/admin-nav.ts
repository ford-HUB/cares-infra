import {
  CircleUser,
  CreditCard,
  FileText,
  LayoutDashboard,
  LibraryBig,
  LifeBuoy,
  Mail,
  MessageSquare,
  Server,
  ShieldCheck,
  Trophy,
  Users,
} from 'lucide-react'
import {
  ADMIN_BASE_PATH,
  ADMIN_CHAT_PATH,
  ADMIN_DEPARTMENT_FILES_PATH,
  ADMIN_EVENT_MAP_PATH,
  ADMIN_MAIL_INBOX_PATH,
  ADMIN_MAINTENANCE_PATH,
  ADMIN_SUPPORT_TICKETS_PATH,
  ADMIN_SYSTEM_DIAGNOSTICS_PATH,
  ADMIN_SYSTEM_NOTICES_PATH,
  ADMIN_SYSTEM_SERVICES_PATH,
  ADMIN_UPLOAD_REPORT_PATH,
} from '../constants/routes'
import { PORTAL_PERMISSION as P } from '../constants/portal-permissions'
import type { PortalNavConfig } from '../types/nav'
import type { PortalRole } from '../types/portal-roles'

/**
 * Program operations — events, tracking, certificates, reports. The admin is a
 * system operator, not a program operator, so these stay hidden from that role.
 */
const OPERATIONS_ROLES: PortalRole[] = ['director', 'coordinator']

/**
 * One portal UI for every portal role. What an item needs is its `permission` — the
 * right an admin grants or revokes per account in Access Control. Grant "View
 * accounts" to a coordinator and Manage Users appears in their sidebar on the next
 * sync; untick "View donations" and Donation drops out. The server checks the same
 * right on every request behind the screen.
 *
 * `roles` is kept only where the right alone cannot decide: the same right served
 * by a different screen per role (the director's report library vs the
 * coordinator's filed record), a screen scoped to one role's job (the school-wide
 * map, the account-request form), items with no catalog right yet (Rankings,
 * Notices), and the operations groups the admin — a system operator, not a program
 * operator — is kept out of by design.
 */
export const adminNav: PortalNavConfig = {
  portalTitle: 'CARES Admin Portal',
  basePath: ADMIN_BASE_PATH,
  items: [
    { type: 'section', label: 'Menu' },
    {
      type: 'group',
      label: 'Dashboard',
      icon: LayoutDashboard,
      children: [
        { label: 'Overview', to: '/admin/overview' },
        { label: 'Statistics', to: '/admin/statistics' },
      ],
    },
    { type: 'link', label: 'User Profile', to: '/admin/profile', icon: CircleUser },

    { type: 'section', label: 'Support' },
    {
      type: 'link',
      label: 'Chat',
      to: ADMIN_CHAT_PATH,
      icon: MessageSquare,
      permission: P.CHAT_ACCESS,
    },
    {
      type: 'link',
      label: 'Mail Inbox',
      to: ADMIN_MAIL_INBOX_PATH,
      icon: Mail,
      // Each account links a personal Google mailbox — nothing here is shared.
      permission: P.MAIL_ACCESS,
    },
    {
      type: 'link',
      label: 'Support Tickets',
      to: ADMIN_SUPPORT_TICKETS_PATH,
      icon: LifeBuoy,
      // Tickets come in from every portal and the mobile app; whoever holds the
      // right triages them.
      permission: P.SUPPORT_TICKET_MANAGE,
    },

    { type: 'section', label: 'Management' },
    {
      type: 'group',
      label: 'Manage Users',
      icon: Users,
      children: [
        // A director asks the admin for an account; the form is theirs alone.
        { label: 'Request', to: '/admin/user-request', roles: ['director'], permission: P.USERS_VIEW },
        { label: 'Master', to: '/admin/manage-users', permission: P.USERS_VIEW },
        { label: 'Access Control', to: '/admin/access-control', permission: P.ACCESS_CONTROL_VIEW },
      ],
    },
    {
      type: 'group',
      label: 'Tracker',
      icon: LibraryBig,
      roles: OPERATIONS_ROLES,
      children: [
        // Donations follow the account's "View donations" right — the director
        // baseline holds it, a coordinator's is whatever the admin set.
        { label: 'Donation', to: '/admin/internal-donation-tracking', permission: P.DONATIONS_VIEW },
        { label: 'Attendance', to: '/admin/attendance-log', permission: P.ATTENDANCE_VIEW },
      ],
    },
    {
      type: 'group',
      label: 'Manage Event',
      icon: FileText,
      roles: OPERATIONS_ROLES,
      permission: P.EVENTS_VIEW,
      children: [
        { label: 'Event', to: '/admin/event-list' },
        { label: 'Attendees', to: '/admin/event-attendees' },
        // The map spans every college; a coordinator works one department at a time.
        { label: 'Map', to: ADMIN_EVENT_MAP_PATH, roles: ['director'] },
        { label: 'Calendar', to: '/admin/event-calendar' },
      ],
    },
    {
      type: 'group',
      label: 'Manage Certificate',
      icon: CreditCard,
      // Held by the director baseline; a coordinator sees it once granted "View certificates".
      roles: OPERATIONS_ROLES,
      permission: P.CERTIFICATES_VIEW,
      children: [
        { label: 'Customization', to: '/admin/templates-list' },
        { label: 'Live Certificates', to: '/admin/deployed-certificate-templates' },
      ],
    },
    {
      type: 'group',
      label: 'Rankings',
      icon: Trophy,
      roles: OPERATIONS_ROLES,
      children: [
        // The ladder is set school-wide by the director; coordinators only read it.
        { label: 'Customization', to: '/admin/ranking-customization', roles: ['director'] },
        { label: 'Ranking', to: '/admin/rankings' },
      ],
    },
    {
      type: 'group',
      label: 'Reports',
      icon: FileText,
      roles: OPERATIONS_ROLES,
      permission: P.REPORTS_VIEW,
      children: [
        // Reviewing is the "Publish reports" right; submitting is the coordinator's job.
        { label: 'Queue Reviewer', to: '/admin/report-queue', permission: P.REPORTS_PUBLISH },
        { label: 'Upload Report', to: ADMIN_UPLOAD_REPORT_PATH, roles: ['coordinator'] },
        // The director's library has folders of its own; the coordinator gets the
        // filed record per department and nothing to rearrange.
        { label: 'Monthly Report', to: '/admin/monthly-reports', roles: ['director'] },
        { label: 'Monthly Report', to: ADMIN_DEPARTMENT_FILES_PATH, roles: ['coordinator'] },
      ],
    },
    { type: 'section', label: 'Administration' },
    {
      type: 'group',
      label: 'Security',
      icon: ShieldCheck,
      children: [
        { label: 'Audit Logs', to: '/admin/audit-logs', permission: P.SECURITY_AUDIT_VIEW },
        { label: 'Login Activity', to: '/admin/login-activity', permission: P.SECURITY_AUDIT_VIEW },
        { label: 'Active Sessions', to: '/admin/active-sessions', permission: P.SECURITY_SESSION_REVOKE },
        { label: 'Security Policies', to: '/admin/security-policies', permission: P.SECURITY_POLICY_MANAGE },
      ],
    },
    {
      type: 'group',
      label: 'System',
      icon: Server,
      children: [
        { label: 'Performance', to: '/admin/system-performance', permission: P.SYSTEM_PERFORMANCE_VIEW },
        { label: 'Notices', to: ADMIN_SYSTEM_NOTICES_PATH },
        { label: 'Services', to: ADMIN_SYSTEM_SERVICES_PATH, permission: P.SYSTEM_SERVICE_MANAGE },
        { label: 'Diagnostics', to: ADMIN_SYSTEM_DIAGNOSTICS_PATH, permission: P.SYSTEM_SERVICE_MANAGE },
        { label: 'Maintenance', to: ADMIN_MAINTENANCE_PATH, permission: P.SYSTEM_MAINTENANCE_MANAGE },
      ],
    },
  ],
}

export function adminPortalLabel(role: string | undefined): string {
  switch (role) {
    case 'admin':
      return 'CARES Admin Portal'
    case 'director':
      return 'CARES Director Portal'
    case 'coordinator':
      return 'CARES Coordinator Portal'
    default:
      return 'CARES Admin Portal'
  }
}
