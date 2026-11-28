import {
  CircleUser,
  ClipboardList,
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
  Wallet,
} from 'lucide-react'
import {
  ADMIN_BASE_PATH,
  ADMIN_CHAT_PATH,
  ADMIN_DEPARTMENT_FILES_PATH,
  ADMIN_EVALUATION_ANSWERS_PATH,
  ADMIN_EVALUATION_FORMS_PATH,
  ADMIN_EVALUATION_QUESTIONNAIRE_PATH,
  ADMIN_EVENT_MAP_PATH,
  ADMIN_MAIL_INBOX_PATH,
  ADMIN_MAINTENANCE_PATH,
  ADMIN_PAYMENT_SETTINGS_PATH,
  ADMIN_RESIDENTIAL_NEEDS_PATH,
  ADMIN_SUPPORT_TICKETS_PATH,
  ADMIN_SYSTEM_DIAGNOSTICS_PATH,
  ADMIN_SYSTEM_NOTICES_PATH,
  ADMIN_SYSTEM_SERVICES_PATH,
  ADMIN_UPLOAD_REPORT_PATH,
} from '../constants/routes'
import { PORTAL_PERMISSION as P } from '../constants/portal-permissions'
import type { PortalNavConfig } from '../types/nav'
import type { PortalRole } from '../types/portal-roles'

/** Admin is a system operator, so operations screens stay hidden from it. */
const OPERATIONS_ROLES: PortalRole[] = ['director', 'coordinator']

/** Items gate on `permission` (per-account, server re-checks); `roles` only where the right alone can't decide. */
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
        { label: 'Residential Needs', to: ADMIN_RESIDENTIAL_NEEDS_PATH, roles: ['director'] },
      ],
    },
    { type: 'link', label: 'User Profile', to: '/admin/profile', icon: CircleUser },
    // Director-only finance setting, also gated on the right.
    {
      type: 'link',
      label: 'Payments',
      to: ADMIN_PAYMENT_SETTINGS_PATH,
      icon: Wallet,
      roles: ['director'],
      permission: P.PAYMENT_SETTINGS_MANAGE,
    },

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
      // Per-account Google mailbox, not shared.
      permission: P.MAIL_ACCESS,
    },
    {
      type: 'link',
      label: 'Support Tickets',
      to: ADMIN_SUPPORT_TICKETS_PATH,
      icon: LifeBuoy,
      permission: P.SUPPORT_TICKET_MANAGE,
    },

    { type: 'section', label: 'Management' },
    {
      type: 'group',
      label: 'Manage Users',
      icon: Users,
      children: [
        { label: 'Request', to: '/admin/user-request', roles: OPERATIONS_ROLES, permission: P.USERS_REQUEST },
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
        // School-wide map; coordinators work one department.
        { label: 'Map', to: ADMIN_EVENT_MAP_PATH, roles: ['director'] },
        { label: 'Calendar', to: '/admin/event-calendar' },
      ],
    },
    {
      type: 'group',
      label: 'Manage Certificate',
      icon: CreditCard,
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
        { label: 'Queue Reviewer', to: '/admin/report-queue', permission: P.REPORTS_PUBLISH },
        { label: 'Upload Report', to: ADMIN_UPLOAD_REPORT_PATH, roles: ['coordinator'] },
        // Coordinators get a per-department filed record instead.
        { label: 'Monthly Report', to: '/admin/monthly-reports', roles: ['director'] },
        { label: 'Monthly Report', to: ADMIN_DEPARTMENT_FILES_PATH, roles: ['coordinator'] },
      ],
    },
    { type: 'section', label: 'Evaluation' },
    {
      type: 'group',
      label: 'Evaluation',
      icon: ClipboardList,
      roles: ['director'],
      children: [
        { label: 'Questionnaire', to: ADMIN_EVALUATION_QUESTIONNAIRE_PATH },
        { label: 'Forms', to: ADMIN_EVALUATION_FORMS_PATH },
        { label: 'Answers', to: ADMIN_EVALUATION_ANSWERS_PATH },
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
