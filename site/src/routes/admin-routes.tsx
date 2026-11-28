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
import { EvaluationAnswersPage } from '../pages/admin/evaluation-answers'
import { EvaluationFormsPage } from '../pages/admin/evaluation-forms'
import { EvaluationQuestionnairePage } from '../pages/admin/evaluation-questionnaire'
import { InternalDonationTrackingPage } from '../pages/admin/internal-donation-tracking'
import { EventMapPage } from '../pages/shared/event-map-page'
import { ActiveSessionsPage } from '../pages/admin/active-sessions'
import { LoginActivityPage } from '../pages/admin/login-activity'
import { MailInboxPage } from '../pages/admin/mail-inbox'
import { MaintenancePage } from '../pages/admin/maintenance'
import { ManageUsersPage } from '../pages/admin/manage-users'
import { MonthlyReportsPage } from '../pages/admin/monthly-reports'
import { PaymentSettingsPage } from '../pages/admin/payment-settings'
import { NeedsClustersPage } from '../pages/admin/needs-clusters'
import { QueueReviewerPage } from '../pages/admin/queue-reviewer'
import { RankingCustomizationPage } from '../pages/admin/ranking-customization'
import { UploadReportPage } from '../pages/admin/upload-report'
import { DepartmentFilesPage } from '../pages/admin/department-files'
import { RankingsPage } from '../pages/admin/rankings'
import { ResidentialNeedsPage } from '../pages/admin/residential-needs'
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

const OPERATIONS_ROLES: PortalRole[] = ['director', 'coordinator']

/** Guards mirror the nav's permission/roles; see `adminNav`. */
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
          {
            element: <ProtectedPortal roles={['director']} />,
            children: [
              { path: 'residential-needs', element: <ResidentialNeedsPage /> },
              { path: 'residential-needs/clusters', element: <NeedsClustersPage /> },
            ],
          },
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
            ],
          },
          {
            element: gated(P.USERS_REQUEST),
            children: [
              { path: 'user-request', element: <UserRequestPage /> },
            ],
          },
          {
            element: gated(P.PAYMENT_SETTINGS_MANAGE, ['director']),
            children: [{ path: 'payments', element: <PaymentSettingsPage /> }],
          },
          {
            element: gated(P.ACCESS_CONTROL_VIEW),
            children: [{ path: 'access-control', element: <AccessControlPage /> }],
          },
          {
            element: gated(P.SECURITY_POLICY_MANAGE),
            children: [{ path: 'security-policies', element: <SecurityPoliciesPage /> }],
          },
          {
            element: gated(P.SECURITY_AUDIT_VIEW),
            children: [
              { path: 'login-activity', element: <LoginActivityPage /> },
              { path: 'audit-logs', element: <AuditLogsPage /> },
            ],
          },
          {
            element: gated(P.SECURITY_SESSION_REVOKE),
            children: [{ path: 'active-sessions', element: <ActiveSessionsPage /> }],
          },
          {
            element: gated(P.MAIL_ACCESS),
            children: [{ path: 'mail-inbox', element: <MailInboxPage /> }],
          },
          {
            element: gated(P.SUPPORT_TICKET_MANAGE),
            children: [{ path: 'support-tickets', element: <SupportTicketsPage /> }],
          },
          {
            // `post-requirements` is a legacy alias.
            element: gated(P.REPORTS_PUBLISH),
            children: [
              { path: 'report-queue', element: <QueueReviewerPage /> },
              { path: 'post-requirements', element: <QueueReviewerPage /> },
            ],
          },
          {
            element: gated(P.REPORTS_VIEW, ['director']),
            children: [{ path: 'monthly-reports', element: <MonthlyReportsPage /> }],
          },
          {
            element: gated(P.REPORTS_VIEW, ['coordinator']),
            children: [
              { path: 'upload-report', element: <UploadReportPage /> },
              { path: 'department-files', element: <DepartmentFilesPage /> },
            ],
          },
          {
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
            element: gated(P.EVENTS_VIEW, ['director']),
            children: [{ path: 'event-map', element: <EventMapPage /> }],
          },
          { path: 'rankings', element: <RankingsPage /> },
          {
            element: <ProtectedPortal roles={['director']} />,
            children: [{ path: 'ranking-customization', element: <RankingCustomizationPage /> }],
          },
          {
            element: gated(P.CERTIFICATES_VIEW, OPERATIONS_ROLES),
            children: [
              { path: 'templates-list', element: <CertificateTemplatesPage /> },
              { path: 'deployed-certificate-templates', element: <DeployedCertificatesPage /> },
            ],
          },
          {
            element: <ProtectedPortal roles={['director']} />,
            children: [
              { path: 'evaluation-questionnaire', element: <EvaluationQuestionnairePage /> },
              { path: 'evaluation-forms', element: <EvaluationFormsPage /> },
              { path: 'evaluation-answers', element: <EvaluationAnswersPage /> },
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
