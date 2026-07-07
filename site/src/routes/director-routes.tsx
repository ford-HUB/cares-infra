import type { RouteObject } from 'react-router-dom'
import { PortalLayout } from '../components/portal/portal-layout'
import { ProtectedPortal } from '../components/portal/protected-portal'
import { directorNav } from '../config/director-nav'
import { DirectorProfile } from '../pages/director/DirectorProfile'
import { DirectorSettingsLayout } from '../pages/director/director-settings'
import { ManageUsersPage } from '../pages/director/ManageUsers'
import { createPlaceholderPage } from '../pages/shared/create-placeholder-page'
import { ManageEventsPage } from '../pages/shared/manage-events-page'
import { NotificationsPage } from '../pages/shared/Notifications'
import { settingsChildRoutes } from './settings-child-routes'

const Overview = createPlaceholderPage('Overview', 'Director dashboard overview and key metrics.')
const Statistics = createPlaceholderPage('Statistics', 'Charts and analytics for CARES programs.')
const SystemPerformance = createPlaceholderPage('System Performance', 'Server and application performance metrics.')
const PostRequirements = createPlaceholderPage('Post Monthly Report', 'Publish monthly reporting requirements.')
const InternalDonationTracking = createPlaceholderPage('Inter Donation Tracking', 'Track internal donation flows.')
const AttendanceLog = createPlaceholderPage('Attendance Log', 'View and export event attendance records.')
const BeneficiaryList = createPlaceholderPage('Beneficiary List', 'Browse registered beneficiaries.')
const BeneficiaryRequest = createPlaceholderPage('Beneficiary Request', 'Review beneficiary registration requests.')
const TemplatePage = createPlaceholderPage('Certificate Templates', 'Manage certificate template categories.')
const DeployedCertificateTemplates = createPlaceholderPage(
  'Deployed Certificate Templates',
  'View and manage deployed certificate templates.',
)

export const directorRoutes: RouteObject[] = [
  {
    path: '/director',
    element: <ProtectedPortal roles={['director']} />,
    children: [
      {
        element: <PortalLayout portal="director" nav={directorNav} />,
        children: [
          { index: true, element: <Overview /> },
          { path: 'overview', element: <Overview /> },
          { path: 'statistics', element: <Statistics /> },
          { path: 'system-performance', element: <SystemPerformance /> },
          { path: 'profile', element: <DirectorProfile /> },
          {
            path: 'settings',
            element: <DirectorSettingsLayout />,
            children: settingsChildRoutes,
          },
          { path: 'manage-users', element: <ManageUsersPage /> },
          { path: 'post-requirements', element: <PostRequirements /> },
          { path: 'internal-donation-tracking', element: <InternalDonationTracking /> },
          { path: 'event-list', element: <ManageEventsPage /> },
          { path: 'attendance-log', element: <AttendanceLog /> },
          { path: 'beneficiary-list', element: <BeneficiaryList /> },
          { path: 'beneficiary-request', element: <BeneficiaryRequest /> },
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
