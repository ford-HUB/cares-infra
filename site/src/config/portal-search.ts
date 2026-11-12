import { Bell, Network } from 'lucide-react'
import { settingsNavItems } from './settings-nav'
import {
  ADMIN_CHAT_PATH,
  ADMIN_DEPARTMENT_FILES_PATH,
  ADMIN_EVALUATION_ANSWERS_PATH,
  ADMIN_EVALUATION_FORMS_PATH,
  ADMIN_EVALUATION_QUESTIONNAIRE_PATH,
  ADMIN_EVENT_MAP_PATH,
  ADMIN_MAIL_INBOX_PATH,
  ADMIN_MAINTENANCE_PATH,
  ADMIN_NEEDS_CLUSTERS_PATH,
  ADMIN_NOTIFICATIONS_PATH,
  ADMIN_PAYMENT_SETTINGS_PATH,
  ADMIN_PROFILE_PATH,
  ADMIN_RESIDENTIAL_NEEDS_PATH,
  ADMIN_SETTINGS_PATH,
  ADMIN_SUPPORT_TICKETS_PATH,
  ADMIN_SYSTEM_DIAGNOSTICS_PATH,
  ADMIN_SYSTEM_NOTICES_PATH,
  ADMIN_SYSTEM_SERVICES_PATH,
  ADMIN_UPLOAD_REPORT_PATH,
} from '../constants/routes'
import type { PortalSearchExtraEntry, PortalSearchRouteMeta } from '../types/portal-search'

/**
 * What each sidebar screen adds to the header search, keyed by its route. The
 * sidebar (config/admin-nav.ts) stays the source of which screens exist and who may
 * open them; this only teaches search what is *inside* each one and the other words
 * people type for it. A route missing here is still found by its sidebar label.
 */
export const PORTAL_SEARCH_ROUTE_META: Record<string, PortalSearchRouteMeta> = {
  '/admin/overview': {
    description: 'Today at a glance — live events, volunteers, approvals and recent activity',
    keywords: ['dashboard', 'home', 'summary', 'kpi', 'metrics'],
  },
  '/admin/statistics': {
    // Programme numbers for directors and coordinators; system usage for the admin.
    description: 'Trends and charts — programme activity, or CPU and service health for admins',
    keywords: ['analytics', 'charts', 'graphs', 'trends', 'cpu usage', 'uptime', 'departments'],
  },
  [ADMIN_RESIDENTIAL_NEEDS_PATH]: {
    description: 'Household needs survey results by barangay',
    keywords: ['survey', 'barangay', 'households', 'community', 'beneficiaries'],
  },
  [ADMIN_PROFILE_PATH]: {
    description: 'Your name, photo, contact details and signature',
    keywords: ['account', 'me', 'avatar', 'photo', 'personal'],
  },
  [ADMIN_PAYMENT_SETTINGS_PATH]: {
    description: 'Where donor payments are received',
    keywords: ['gcash', 'bank', 'payment', 'donor', 'qr', 'finance'],
  },
  [ADMIN_CHAT_PATH]: {
    description: 'Direct and group conversations with staff',
    keywords: ['messages', 'messaging', 'conversation', 'dm', 'talk'],
  },
  [ADMIN_MAIL_INBOX_PATH]: {
    description: 'Your linked Google mailbox — read, compose and reply',
    keywords: ['email', 'gmail', 'compose', 'send', 'inbox'],
  },
  [ADMIN_SUPPORT_TICKETS_PATH]: {
    description: 'Help requests from the portal and mobile app',
    keywords: ['help', 'issues', 'bugs', 'helpdesk', 'tickets', 'support'],
  },
  '/admin/user-request': {
    description: 'Request new accounts for your department',
    keywords: ['account request', 'new user', 'invite', 'onboarding'],
  },
  '/admin/manage-users': {
    description: 'Every account — roles, status, suspensions and exports',
    keywords: ['users', 'accounts', 'staff', 'volunteers', 'people', 'master list'],
  },
  '/admin/access-control': {
    description: 'Grant or revoke rights per account and role',
    keywords: ['permissions', 'rights', 'rbac', 'roles', 'access'],
  },
  '/admin/internal-donation-tracking': {
    description: 'Donations received, by event and donor',
    keywords: ['donor', 'donations', 'funds', 'money', 'contributions'],
  },
  '/admin/attendance-log': {
    description: 'Live and past attendance, geofence check-ins and manual entries',
    keywords: ['check in', 'attendance', 'present', 'geofence', 'time in'],
  },
  '/admin/event-list': {
    description: 'Create, edit and publish outreach events',
    keywords: ['events', 'activities', 'outreach', 'create event', 'schedule'],
  },
  '/admin/event-attendees': {
    description: 'Who registered for and attended each event',
    keywords: ['participants', 'volunteers', 'registrants', 'roster'],
  },
  [ADMIN_EVENT_MAP_PATH]: {
    description: 'Every event location on a school-wide map',
    keywords: ['map', 'location', 'geography', 'pins', 'venue'],
  },
  '/admin/event-calendar': {
    description: 'Events laid out by month and week',
    keywords: ['calendar', 'schedule', 'dates', 'month'],
  },
  '/admin/templates-list': {
    description: 'Design certificate templates — layout, fonts, seals',
    keywords: ['certificate', 'template', 'design', 'customize'],
  },
  '/admin/deployed-certificate-templates': {
    description: 'Certificates issued to volunteers',
    keywords: ['certificate', 'issued', 'deployed', 'awards'],
  },
  '/admin/ranking-customization': {
    description: 'Set the volunteer rank ladder and thresholds',
    keywords: ['ranks', 'levels', 'badges', 'tiers', 'gamification'],
  },
  '/admin/rankings': {
    description: 'Volunteer leaderboard by hours and events',
    keywords: ['leaderboard', 'top volunteers', 'ranks', 'scores'],
  },
  '/admin/report-queue': {
    description: 'Review and publish submitted reports',
    keywords: ['approve', 'review', 'pending reports', 'queue'],
  },
  [ADMIN_UPLOAD_REPORT_PATH]: {
    description: 'Submit a report for your department',
    keywords: ['upload', 'submit', 'report', 'file'],
  },
  '/admin/monthly-reports': {
    description: 'The report library, organised in folders',
    keywords: ['reports', 'library', 'folders', 'documents', 'monthly'],
  },
  [ADMIN_DEPARTMENT_FILES_PATH]: {
    description: "Your department's filed monthly reports",
    keywords: ['reports', 'department', 'files', 'monthly'],
  },
  [ADMIN_EVALUATION_QUESTIONNAIRE_PATH]: {
    description: 'Write post-event evaluation questions',
    keywords: ['questions', 'survey', 'feedback', 'evaluation'],
  },
  [ADMIN_EVALUATION_FORMS_PATH]: {
    description: 'Which questionnaire each event asks',
    keywords: ['forms', 'evaluation', 'feedback'],
  },
  [ADMIN_EVALUATION_ANSWERS_PATH]: {
    description: 'Evaluation responses and exports',
    keywords: ['responses', 'results', 'feedback', 'answers'],
  },
  '/admin/audit-logs': {
    description: 'Who changed what, and when',
    keywords: ['logs', 'history', 'audit trail', 'changes', 'activity'],
  },
  '/admin/login-activity': {
    description: 'Sign-ins, failures and where they came from',
    keywords: ['logins', 'sign in', 'failed', 'ip', 'devices'],
  },
  '/admin/active-sessions': {
    description: 'Signed-in sessions — revoke one remotely',
    keywords: ['sessions', 'devices', 'revoke', 'logout', 'signed in'],
  },
  '/admin/security-policies': {
    description: 'Password rules, lockouts and session timeouts',
    keywords: ['password policy', 'lockout', 'timeout', 'mfa', 'security'],
  },
  '/admin/system-performance': {
    description: 'CPU load, memory and response times',
    keywords: ['cpu', 'memory', 'latency', 'uptime', 'health', 'monitoring'],
  },
  [ADMIN_SYSTEM_NOTICES_PATH]: {
    description: 'Announcements shown across the portal',
    keywords: ['announcements', 'banner', 'notice', 'broadcast'],
  },
  [ADMIN_SYSTEM_SERVICES_PATH]: {
    description: 'Start, stop and check backend services',
    keywords: ['services', 'microservices', 'ocr', 'face recognition', 'restart'],
  },
  [ADMIN_SYSTEM_DIAGNOSTICS_PATH]: {
    description: 'Run checks against the database, cache and services',
    keywords: ['diagnostics', 'health check', 'database', 'redis', 'troubleshoot'],
  },
  [ADMIN_MAINTENANCE_PATH]: {
    description: 'Maintenance mode and scheduled downtime',
    keywords: ['maintenance', 'downtime', 'offline', 'maintenance mode'],
  },
}

/** Extra words for a settings section, keyed by its route segment. */
const SETTINGS_KEYWORDS: Record<string, string[]> = {
  email: ['sign in', 'address', 'login'],
  password: ['security', 'credentials', 'reset'],
}

/** Screens reachable inside modules that the sidebar does not list on its own. */
export const PORTAL_SEARCH_EXTRA_ENTRIES: PortalSearchExtraEntry[] = [
  {
    kind: 'page',
    label: 'Notifications',
    to: ADMIN_NOTIFICATIONS_PATH,
    icon: Bell,
    description: 'Every notice sent to you — read, unread, cleared',
    keywords: ['alerts', 'unread', 'inbox', 'bell'],
  },
  {
    kind: 'page',
    label: 'Needs Clusters',
    trail: 'Residential Needs',
    to: ADMIN_NEEDS_CLUSTERS_PATH,
    icon: Network,
    roles: ['director'],
    description: 'Households grouped by similar needs',
    keywords: ['clusters', 'groups', 'segments', 'survey'],
  },
  // Settings sections come from config/settings-nav.ts, so a new section is
  // searchable the moment it is added there.
  ...settingsNavItems.map(
    (item): PortalSearchExtraEntry => ({
      kind: 'setting',
      label: item.label,
      trail: 'Settings',
      to: `${ADMIN_SETTINGS_PATH}/${item.segment}`,
      icon: item.icon,
      description: item.description,
      keywords: ['settings', 'account', item.segment, ...(SETTINGS_KEYWORDS[item.segment] ?? [])],
    }),
  ),
]
