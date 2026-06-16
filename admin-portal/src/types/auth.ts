export type AdminRole = 'super_admin' | 'event_coordinator';

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AdminRole;
  requires2fa: boolean;
}

export interface AuthSession {
  user: AdminUser;
  token: string;
  verified2fa: boolean;
}

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  event_coordinator: 'Event Coordinator',
};

export const ADMIN_PERMISSIONS = {
  super_admin: [
    'manage_users',
    'manage_events',
    'manage_donations',
    'view_registrations',
    'view_reports',
    'view_analytics',
    'manage_content',
  ],
  event_coordinator: [
    'manage_events',
    'manage_donations',
    'view_registrations',
  ],
} as const;

export type AdminPermission =
  (typeof ADMIN_PERMISSIONS)[AdminRole][number];

export function hasPermission(
  role: AdminRole,
  permission: AdminPermission,
): boolean {
  return (ADMIN_PERMISSIONS[role] as readonly string[]).includes(permission);
}
