import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from '@/components/AdminLayout';
import { GuestRoute, ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import type { AdminPermission } from '@/types/auth';
import {
  AnalyticsPage,
  DashboardOverviewPage,
  DonationsPage,
  EventsPage,
  RegistrationsPage,
  ReportsPage,
  UnauthorizedPage,
  UsersPage,
} from '@/pages/DashboardPages';
import { LoginPage } from '@/pages/LoginPage';
import { TwoFactorPage } from '@/pages/TwoFactorPage';

function PermissionRoute({
  permission,
  children,
}: {
  permission: AdminPermission;
  children: ReactNode;
}) {
  const { can } = useAuth();
  if (!can(permission)) {
    return <UnauthorizedPage />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route path="/verify-2fa" element={<TwoFactorPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/dashboard" element={<DashboardOverviewPage />} />
          <Route
            path="/dashboard/events"
            element={
              <PermissionRoute permission="manage_events">
                <EventsPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/dashboard/donations"
            element={
              <PermissionRoute permission="manage_donations">
                <DonationsPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/dashboard/registrations"
            element={
              <PermissionRoute permission="view_registrations">
                <RegistrationsPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/dashboard/users"
            element={
              <PermissionRoute permission="manage_users">
                <UsersPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/dashboard/reports"
            element={
              <PermissionRoute permission="view_reports">
                <ReportsPage />
              </PermissionRoute>
            }
          />
          <Route
            path="/dashboard/analytics"
            element={
              <PermissionRoute permission="view_analytics">
                <AnalyticsPage />
              </PermissionRoute>
            }
          />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
