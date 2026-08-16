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
  Users,
} from 'lucide-react'
import {
  ADMIN_BASE_PATH,
  ADMIN_CHAT_PATH,
  ADMIN_MAIL_INBOX_PATH,
  ADMIN_MAINTENANCE_PATH,
  ADMIN_SUPPORT_TICKETS_PATH,
  ADMIN_SYSTEM_NOTICES_PATH,
  ADMIN_SYSTEM_SERVICES_PATH,
} from '../constants/routes'
import type { PortalNavConfig } from '../types/nav'
import type { PortalRole } from '../types/portal-roles'

/**
 * Program operations — events, tracking, certificates, reports. The admin is a
 * system operator, not a program operator, so these stay hidden from that role.
 */
const OPERATIONS_ROLES: PortalRole[] = ['director', 'coordinator']

/**
 * One portal UI for every portal role. Access differs per item: add `roles` to an
 * item or a child to hide it from roles that shouldn't see it.
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
    { type: 'link', label: 'Chat', to: ADMIN_CHAT_PATH, icon: MessageSquare },
    {
      type: 'link',
      label: 'Mail Inbox',
      to: ADMIN_MAIL_INBOX_PATH,
      icon: Mail,
      // Each admin links a personal Google mailbox — nothing here is shared.
      roles: ['admin'],
    },
    { type: 'link', label: 'Support Tickets', to: ADMIN_SUPPORT_TICKETS_PATH, icon: LifeBuoy },

    { type: 'section', label: 'Management' },
    {
      type: 'group',
      label: 'Manage Users',
      icon: Users,
      roles: ['admin', 'director'],
      children: [
        { label: 'Request', to: '/admin/user-request', roles: ['director'] },
        { label: 'Master', to: '/admin/manage-users' },
        { label: 'Access Control', to: '/admin/access-control', roles: ['admin'] },
      ],
    },
    {
      type: 'group',
      label: 'Tracker',
      icon: LibraryBig,
      roles: OPERATIONS_ROLES,
      children: [
        { label: 'Donation', to: '/admin/internal-donation-tracking' },
        { label: 'Attendance', to: '/admin/attendance-log' },
      ],
    },
    {
      type: 'group',
      label: 'Manage Event',
      icon: FileText,
      roles: OPERATIONS_ROLES,
      children: [
        { label: 'Event', to: '/admin/event-list' },
        { label: 'Attendees', to: '/admin/event-attendees' },
        { label: 'Participants', to: '/admin/event-participants' },
        { label: 'Calendar', to: '/admin/event-calendar' },
      ],
    },
    {
      type: 'group',
      label: 'Manage Certificate',
      icon: CreditCard,
      roles: OPERATIONS_ROLES,
      children: [
        { label: 'Templates', to: '/admin/templates-list' },
        { label: 'Deployed Templates', to: '/admin/deployed-certificate-templates' },
      ],
    },
    {
      type: 'group',
      label: 'Reports',
      icon: FileText,
      roles: OPERATIONS_ROLES,
      children: [{ label: 'Monthly Report', to: '/admin/post-requirements' }],
    },
    { type: 'section', label: 'Administration' },
    {
      type: 'group',
      label: 'Security',
      icon: ShieldCheck,
      roles: ['admin'],
      children: [
        { label: 'Audit Logs', to: '/admin/audit-logs' },
        { label: 'Login Activity', to: '/admin/login-activity' },
        { label: 'Active Sessions', to: '/admin/active-sessions' },
        { label: 'Security Policies', to: '/admin/security-policies' },
        { label: 'Backup & Recovery', to: '/admin/backup-recovery' },
      ],
    },
    {
      type: 'group',
      label: 'System',
      icon: Server,
      children: [
        { label: 'Performance', to: '/admin/system-performance', roles: ['admin'] },
        { label: 'Notices', to: ADMIN_SYSTEM_NOTICES_PATH },
        { label: 'Services', to: ADMIN_SYSTEM_SERVICES_PATH, roles: ['admin'] },
        { label: 'Maintenance', to: ADMIN_MAINTENANCE_PATH, roles: ['admin'] },
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
