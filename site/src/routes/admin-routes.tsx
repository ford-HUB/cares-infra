import type { RouteObject } from 'react-router-dom'
import type { PortalRole } from '../types/portal-roles'
import { AdminPortalLayout } from '../components/portal/admin-portal-layout'
import { ProtectedPortal } from '../components/portal/protected-portal'
import { PORTAL_ROLES } from '../constants/auth'
import { PORTAL_PERMISSION as P } from '../constants/portal-permissions'
import { AdminDashboard } from '../pages/admin/admin-dashboard'
import { StatisticsPage } from '../pages/admin/statistics'
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
import { UploadReportPage } from '../pages/admin/upload-report'
import { DepartmentFilesPage } from '../pages/admin/department-files'
import { RankingsPage } from '../pages/admin/rankings'
import { SecurityPoliciesPage } from '../pages/admin/security-policies'
import { SupportTicketsPage } from '../pages/admin/support-tickets'
import { SystemNoticesPage } from '../pages/admin/system-notices'
import { SystemPerformancePage } from '../pages/admin/system-performance'
import { SystemServicesPage } from '../pages/admin/system-services'
import { SystemDiagnosticsPage } from '../pages/admin/system-diagnostics'
import { UserRequestPage } from '../pages/admin/user-request'
import { ChatPage } from '../pages/shared/chat-page'
import { createPlaceholderPage } from '../pages/shared/create-placeholder-page'
import { ManageEventsPage } from '../pages/shared/manage-events-page'
import { NotificationsPage } from '../pages/shared/Notifications'
import { settingsChildRoutes } from './settings-child-routes'

/** Program operations — the roles the tracker, event and report screens serve. */
const OPERATIONS_ROLES: PortalRole[] = ['director', 'coordinator']

/**
 * Every guarded page carries the same right as its sidebar entry, so hiding an item
 * from the nav and refusing its URL are one decision, and both follow what an admin
 * ticks in Access Control on the next sync. Roles narrow a guard only where the nav
 * does the same — see the note on `adminNav`.
 */
const gated = (permission: string, roles: PortalRole[] = PORTAL_ROLES) => (
  <ProtectedPortal roles={roles} permission={permission} />
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
          { path: 'statistics', element: <StatisticsPage /> },
          { path: 'profile', element: <AdminProfile /> },
          { path: 'system-notices', element: <SystemNoticesPage /> },
          {
            element: gated(P.CHAT_ACCESS),
            children: [{ path: 'chat', element: <ChatPage /> }],
          },
          {
            element: gated(P.SYSTEM_PERFORMANCE_VIEW),
            children: [{ path: 'system-performance', element: <SystemPerformancePage /> }],
          },
          {
            element: gated(P.SYSTEM_SERVICE_MANAGE),
            children: [{ path: 'system-services', element: <SystemServicesPage /> }],
          },
          {
            element: gated(P.SYSTEM_SERVICE_MANAGE),
            children: [{ path: 'system-diagnostics', element: <SystemDiagnosticsPage /> }],
          },
          {
            element: gated(P.SYSTEM_MAINTENANCE_MANAGE),
            children: [{ path: 'maintenance', element: <MaintenancePage /> }],
          },
          {
            path: 'settings',
            element: <AdminSettingsLayout />,
            children: settingsChildRoutes,
          },
          {
            element: gated(P.USERS_VIEW),
            children: [
              { path: 'manage-users', element: <ManageUsersPage /> },
              { path: 'user-request', element: <UserRequestPage /> },
            ],
          },
          {
            element: gated(P.ACCESS_CONTROL_VIEW),
            children: [{ path: 'access-control', element: <AccessControlPage /> }],
          },
          {
            // The policy decides who can sign in at all — the same right the server
            // requires on /api/v1/security-policy.
            element: gated(P.SECURITY_POLICY_MANAGE),
            children: [{ path: 'security-policies', element: <SecurityPoliciesPage /> }],
          },
          {
            // The sign-in trail exposes every account's IPs; the server requires the
            // same right on /api/v1/login-activity and /api/v1/audit-logs.
            element: gated(P.SECURITY_AUDIT_VIEW),
            children: [
              { path: 'login-activity', element: <LoginActivityPage /> },
              { path: 'audit-logs', element: <AuditLogsPage /> },
            ],
          },
          {
            // Every account's signed-in devices are listed and revocable here — the
            // same right the server requires on /api/v1/sessions.
            element: gated(P.SECURITY_SESSION_REVOKE),
            children: [{ path: 'active-sessions', element: <ActiveSessionsPage /> }],
          },
          {
            // Each account links its own Google mailbox; it is not a shared inbox.
            element: gated(P.MAIL_ACCESS),
            children: [{ path: 'mail-inbox', element: <MailInboxPage /> }],
          },
          {
            element: gated(P.SUPPORT_TICKET_MANAGE),
            children: [{ path: 'support-tickets', element: <SupportTicketsPage /> }],
          },
          {
            // Reviewing follows the "Publish reports" right, whoever holds it;
            // `post-requirements` is the queue's original path, kept working.
            element: gated(P.REPORTS_PUBLISH),
            children: [
              { path: 'report-queue', element: <QueueReviewerPage /> },
              { path: 'post-requirements', element: <QueueReviewerPage /> },
            ],
          },
          {
            // The filed library is the director's screen; the coordinator has their
            // own filed record below.
            element: gated(P.REPORTS_VIEW, ['director']),
            children: [{ path: 'monthly-reports', element: <MonthlyReportsPage /> }],
          },
          {
            // The coordinator's half: submit a report, then read the filed record.
            element: gated(P.REPORTS_VIEW, ['coordinator']),
            children: [
              { path: 'upload-report', element: <UploadReportPage /> },
              { path: 'department-files', element: <DepartmentFilesPage /> },
            ],
          },
          {
            // The ledger follows the "View donations" right, not the role — an admin
            // can open it to a coordinator, or close it to a director, per account.
            element: gated(P.DONATIONS_VIEW, OPERATIONS_ROLES),
            children: [
              { path: 'internal-donation-tracking', element: <InternalDonationTrackingPage /> },
            ],
          },
          {
            element: gated(P.ATTENDANCE_VIEW, OPERATIONS_ROLES),
            children: [{ path: 'attendance-log', element: <AttendanceLogPage /> }],
          },
          {
            element: gated(P.EVENTS_VIEW, OPERATIONS_ROLES),
            children: [
              { path: 'event-list', element: <ManageEventsPage /> },
              { path: 'event-attendees', element: <EventAttendeesPage /> },
              { path: 'event-calendar', element: <EventCalendarPage /> },
            ],
          },
          {
            // The nav shows Map to directors only; the route matches so a coordinator
            // typing the URL is bounced instead of reaching the school-wide map.
            element: gated(P.EVENTS_VIEW, ['director']),
            children: [{ path: 'event-map', element: <EventMapPage /> }],
          },
          { path: 'rankings', element: <RankingsPage /> },
          {
            // Ranking Customization is director-only in the nav; the route matches so
            // a coordinator typing the URL is bounced to their dashboard.
            element: <ProtectedPortal roles={['director']} />,
            children: [{ path: 'ranking-customization', element: <RankingCustomizationPage /> }],
          },
          {
            // Held by the director baseline; a coordinator granted "View
            // certificates" reaches it too.
            element: gated(P.CERTIFICATES_VIEW, OPERATIONS_ROLES),
            children: [
              { path: 'templates-list', element: <CertificateTemplatesPage /> },
              { path: 'deployed-certificate-templates', element: <DeployedCertificatesPage /> },
            ],
          },
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
