import type { RouteObject } from 'react-router-dom'
import { AdminPortalLayout } from '../components/portal/admin-portal-layout'
import { ProtectedPortal } from '../components/portal/protected-portal'
import { ADMIN_ONLY_ROLES, PORTAL_ROLES } from '../constants/auth'
import { AdminDashboard } from '../pages/admin/admin-dashboard'
import { AdminProfile } from '../pages/admin/admin-profile'
import { AdminSettingsLayout } from '../pages/admin/admin-settings'
import { AccessControlPage } from '../pages/admin/access-control'
import { AttendanceLogPage } from '../pages/admin/attendance-log'
import { AuditLogsPage } from '../pages/admin/audit-logs'
import { CertificateTemplatesPage } from '../pages/admin/certificate-templates'
import { DeployedCertificatesPage } from '../pages/admin/deployed-certificates'
import { EventAttendeesPage } from '../pages/admin/event-attendees'
import { EventCalendarPage } from '../pages/admin/event-calendar'
import { InternalDonationTrackingPage } from '../pages/admin/internal-donation-tracking'
import { EventMapPage } from '../pages/shared/event-map-page'
import { ActiveSessionsPage } from '../pages/admin/active-sessions'
import { LoginActivityPage } from '../pages/admin/login-activity'
import { MailInboxPage } from '../pages/admin/mail-inbox'
import { MaintenancePage } from '../pages/admin/maintenance'
import { ManageUsersPage } from '../pages/admin/manage-users'
import { MonthlyReportsPage } from '../pages/admin/monthly-reports'
import { QueueReviewerPage } from '../pages/admin/queue-reviewer'
import { RankingCustomizationPage } from '../pages/admin/ranking-customization'
import { RankingsPage } from '../pages/admin/rankings'
import { SecurityPoliciesPage } from '../pages/admin/security-policies'
import { SupportTicketsPage } from '../pages/admin/support-tickets'
import { SystemNoticesPage } from '../pages/admin/system-notices'
import { SystemPerformancePage } from '../pages/admin/system-performance'
import { SystemServicesPage } from '../pages/admin/system-services'
import { UserRequestPage } from '../pages/admin/user-request'
import { ChatPage } from '../pages/shared/chat-page'
import { createPlaceholderPage } from '../pages/shared/create-placeholder-page'
import { ManageEventsPage } from '../pages/shared/manage-events-page'
import { NotificationsPage } from '../pages/shared/Notifications'
import { settingsChildRoutes } from './settings-child-routes'

const Statistics = createPlaceholderPage('Statistics', 'Charts and analytics for CARES programs.')

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
          { path: 'system-performance', element: <SystemPerformancePage /> },
          { path: 'profile', element: <AdminProfile /> },
          { path: 'chat', element: <ChatPage /> },
          { path: 'system-notices', element: <SystemNoticesPage /> },
          { path: 'system-services', element: <SystemServicesPage /> },
          { path: 'maintenance', element: <MaintenancePage /> },
          {
            path: 'settings',
            element: <AdminSettingsLayout />,
            children: settingsChildRoutes,
          },
          { path: 'manage-users', element: <ManageUsersPage /> },
          { path: 'user-request', element: <UserRequestPage /> },
          {
            // Admin-only, nested so the rest of the portal keeps PORTAL_ROLES.
            element: <ProtectedPortal roles={ADMIN_ONLY_ROLES} />,
            children: [
              { path: 'access-control', element: <AccessControlPage /> },
              // The policy decides who can sign in at all, matching the server's
              // @Roles(ADMIN) on /api/v1/security-policy.
              { path: 'security-policies', element: <SecurityPoliciesPage /> },
              // The sign-in trail exposes every account's IPs — admin-only, matching
              // the server's @Roles(ADMIN) on /api/v1/login-activity.
              { path: 'login-activity', element: <LoginActivityPage /> },
              // The nav lists Audit Logs under admin-only Security, so the route matches.
              { path: 'audit-logs', element: <AuditLogsPage /> },
              // Every account's signed-in devices are listed and revocable here,
              // matching the server's @Roles(ADMIN) on /api/v1/sessions.
              { path: 'active-sessions', element: <ActiveSessionsPage /> },
              // Each admin links their own Google mailbox; it is not a shared inbox.
              { path: 'mail-inbox', element: <MailInboxPage /> },
              // The nav shows Support Tickets to admins only; the route matches.
              { path: 'support-tickets', element: <SupportTicketsPage /> },
            ],
          },
          // Reviewing and the filed library are two different jobs, so they are two
          // screens; `post-requirements` is the queue's original path, kept working.
          { path: 'report-queue', element: <QueueReviewerPage /> },
          { path: 'post-requirements', element: <QueueReviewerPage /> },
          { path: 'monthly-reports', element: <MonthlyReportsPage /> },
          { path: 'internal-donation-tracking', element: <InternalDonationTrackingPage /> },
          { path: 'event-list', element: <ManageEventsPage /> },
          { path: 'attendance-log', element: <AttendanceLogPage /> },
          { path: 'event-attendees', element: <EventAttendeesPage /> },
          { path: 'event-map', element: <EventMapPage /> },
          { path: 'event-calendar', element: <EventCalendarPage /> },
          { path: 'rankings', element: <RankingsPage /> },
          { path: 'ranking-customization', element: <RankingCustomizationPage /> },
          { path: 'templates-list', element: <CertificateTemplatesPage /> },
          { path: 'deployed-certificate-templates', element: <DeployedCertificatesPage /> },
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
