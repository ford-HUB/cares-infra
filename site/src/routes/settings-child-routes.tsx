import { Navigate } from 'react-router-dom'
import type { RouteObject } from 'react-router-dom'
import { ChangeEmailSettingsPage } from '../pages/shared/settings/change-email-settings'
import { ChangePasswordSettingsPage } from '../pages/shared/settings/change-password-settings'

export const settingsChildRoutes: RouteObject[] = [
  { index: true, element: <Navigate to="email" replace /> },
  { path: 'email', element: <ChangeEmailSettingsPage /> },
  { path: 'password', element: <ChangePasswordSettingsPage /> },
]
