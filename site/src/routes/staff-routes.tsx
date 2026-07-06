import type { RouteObject } from 'react-router-dom'
import { PortalLayout } from '../components/portal/portal-layout'
import { ProtectedPortal } from '../components/portal/protected-portal'
import { staffNav, staffPortalLabel } from '../config/staff-nav'
import { createPlaceholderPage } from '../pages/shared/create-placeholder-page'
import { ManageEventsPage } from '../pages/shared/manage-events-page'
import { NotificationsPage } from '../pages/shared/Notifications'
import { StaffDashboard } from '../pages/staff/StaffDashboard'
import { StaffProfile } from '../pages/staff/StaffProfile'
import { StaffSettingsLayout } from '../pages/staff/staff-settings'
import { useAuthStore } from '../store/auth-store'
import { settingsChildRoutes } from './settings-child-routes'

const AttendanceLog = createPlaceholderPage('Attendance Log')

function StaffPortalLayout() {
  const role = useAuthStore((s) => s.user?.role)
  return (
    <PortalLayout
      portal="staff"
      nav={staffNav}
      title={staffPortalLabel(role)}
    />
  )
}

export const staffRoutes: RouteObject[] = [
  {
    path: '/management',
    element: (
      <ProtectedPortal
        roles={['staff', 'coordinator', 'assistant_coordinator']}
      />
    ),
    children: [
      {
        element: <StaffPortalLayout />,
        children: [
          { index: true, element: <StaffDashboard /> },
          { path: 'dashboard', element: <StaffDashboard /> },
          { path: 'profile', element: <StaffProfile /> },
          {
            path: 'settings',
            element: <StaffSettingsLayout />,
            children: settingsChildRoutes,
          },
          { path: 'event-list', element: <ManageEventsPage /> },
          { path: 'attendance-log', element: <AttendanceLog /> },
          { path: 'notifications', element: <NotificationsPage /> },
          { path: 'calendar', element: createPlaceholderPage('Calendar')() },
          { path: 'map', element: createPlaceholderPage('Map')() },
          { path: 'volunteer-profile', element: createPlaceholderPage('Volunteer Profile')() },
          { path: 'QrCode-Scanner', element: createPlaceholderPage('QR Scanner')() },
          { path: 'certificate', element: createPlaceholderPage('Certificates')() },
          { path: 'certificate-viewer', element: createPlaceholderPage('Certificate Viewer')() },
          { path: 'overview', element: createPlaceholderPage('Overview')() },
        ],
      },
    ],
  },
]
