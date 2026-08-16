import type { RouteObject } from 'react-router-dom'
import { AdminPortalLayout } from '../components/portal/admin-portal-layout'
import { ProtectedPortal } from '../components/portal/protected-portal'
import { ADMIN_ONLY_ROLES, PORTAL_ROLES } from '../constants/auth'
import { AdminDashboard } from '../pages/admin/admin-dashboard'
import { AdminProfile } from '../pages/admin/admin-profile'
import { AdminSettingsLayout } from '../pages/admin/admin-settings'
import { AccessControlPage } from '../pages/admin/access-control'
import { MailInboxPage } from '../pages/admin/mail-inbox'
import { ManageUsersPage } from '../pages/admin/manage-users'
import { ChatPage } from '../pages/shared/chat-page'
import { createPlaceholderPage } from '../pages/shared/create-placeholder-page'
import { ManageEventsPage } from '../pages/shared/manage-events-page'
import { NotificationsPage } from '../pages/shared/Notifications'
import { settingsChildRoutes } from './settings-child-routes'

const Statistics = createPlaceholderPage('Statistics', 'Charts and analytics for CARES programs.')
const SystemPerformance = createPlaceholderPage('System Performance', 'Server and application performance metrics.')
const UserRequest = createPlaceholderPage('User Request', 'Review portal access and account requests.')
const SupportTickets = createPlaceholderPage('Support Tickets', 'Track and resolve portal support requests.')
const AuditLogs = createPlaceholderPage('Audit Logs', 'Immutable trail of privileged actions across the portal.')
const LoginActivity = createPlaceholderPage('Login Activity', 'Sign-in attempts, failures, and lockouts.')
const ActiveSessions = createPlaceholderPage('Active Sessions', 'Signed-in devices, with the option to revoke.')
const SecurityPolicies = createPlaceholderPage('Security Policies', 'Password rules, MFA, and session timeouts.')
const BackupRecovery = createPlaceholderPage('Backup & Recovery', 'Database backup schedule and restore points.')
const SystemNotices = createPlaceholderPage('System Notices', 'Portal-wide announcements and system alerts.')
const SystemServices = createPlaceholderPage('System Services', 'Status and controls for CARES backend services.')
const Maintenance = createPlaceholderPage('Maintenance', 'System maintenance mode and housekeeping tasks.')
const PostRequirements = createPlaceholderPage('Post Monthly Report', 'Publish monthly reporting requirements.')
const InternalDonationTracking = createPlaceholderPage('Inter Donation Tracking', 'Track internal donation flows.')
const AttendanceLog = createPlaceholderPage('Attendance Log', 'View and export event attendance records.')
const EventAttendees = createPlaceholderPage('Event Attendees', 'List of attendees per event.')
const EventParticipants = createPlaceholderPage('Event Participants', 'List of participants per event.')
const EventCalendar = createPlaceholderPage('Event Calendar', 'Calendar view of scheduled events.')
const TemplatePage = createPlaceholderPage('Certificate Templates', 'Manage certificate template categories.')
const DeployedCertificateTemplates = createPlaceholderPage(
  'Deployed Certificate Templates',
  'View and manage deployed certificate templates.',
)

export const adminRoutes: RouteObject[] = [
  {
    path: '/admin',
    element: <ProtectedPortal roles={PORTAL_ROLES} />,
    children: [
      {
        element: <AdminPortalLayout />,
        children: [
          { index: true, element: <AdminDashboard /> },
          { path: 'overview', element: <AdminDashboard /> },
          { path: 'statistics', element: <Statistics /> },
          { path: 'system-performance', element: <SystemPerformance /> },
          { path: 'profile', element: <AdminProfile /> },
          { path: 'chat', element: <ChatPage /> },
          { path: 'support-tickets', element: <SupportTickets /> },
          { path: 'audit-logs', element: <AuditLogs /> },
          { path: 'login-activity', element: <LoginActivity /> },
          { path: 'active-sessions', element: <ActiveSessions /> },
          { path: 'security-policies', element: <SecurityPolicies /> },
          { path: 'backup-recovery', element: <BackupRecovery /> },
          { path: 'system-notices', element: <SystemNotices /> },
          { path: 'system-services', element: <SystemServices /> },
          { path: 'maintenance', element: <Maintenance /> },
          {
            path: 'settings',
            element: <AdminSettingsLayout />,
            children: settingsChildRoutes,
          },
          { path: 'manage-users', element: <ManageUsersPage /> },
          { path: 'user-request', element: <UserRequest /> },
          {
            // Admin-only, nested so the rest of the portal keeps PORTAL_ROLES.
            element: <ProtectedPortal roles={ADMIN_ONLY_ROLES} />,
            children: [
              { path: 'access-control', element: <AccessControlPage /> },
              // Each admin links their own Google mailbox; it is not a shared inbox.
              { path: 'mail-inbox', element: <MailInboxPage /> },
            ],
          },
          { path: 'post-requirements', element: <PostRequirements /> },
          { path: 'internal-donation-tracking', element: <InternalDonationTracking /> },
          { path: 'event-list', element: <ManageEventsPage /> },
          { path: 'attendance-log', element: <AttendanceLog /> },
          { path: 'event-attendees', element: <EventAttendees /> },
          { path: 'event-participants', element: <EventParticipants /> },
          { path: 'event-calendar', element: <EventCalendar /> },
          { path: 'templates-list', element: <TemplatePage /> },
          { path: 'deployed-certificate-templates', element: <DeployedCertificateTemplates /> },
          { path: 'notifications', element: <NotificationsPage /> },
          { path: 'payment-status', element: createPlaceholderPage('Payment Status')() },
          { path: 'map', element: createPlaceholderPage('Map')() },
          { path: 'volunteer-profile', element: createPlaceholderPage('Volunteer Profile')() },
          { path: 'QrCode-Scanner', element: createPlaceholderPage('QR Scanner')() },
          { path: 'certificate', element: createPlaceholderPage('Certificates')() },
          { path: 'certificate-viewer', element: createPlaceholderPage('Certificate Viewer')() },
          { path: 'event-donations', element: createPlaceholderPage('Event Donations')() },
        ],
      },
    ],
  },
]
