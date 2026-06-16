import type { AdminUser } from '@/types/auth';

/** Demo credentials for the static prototype phase. */
export const DEMO_OTP = '123456';

interface MockAdminRecord extends AdminUser {
  password: string;
}

export const MOCK_ADMINS: MockAdminRecord[] = [
  {
    id: 'admin-1',
    email: 'superadmin@cares.local',
    password: 'admin123',
    firstName: 'Maria',
    lastName: 'Santos',
    role: 'super_admin',
    requires2fa: true,
  },
  {
    id: 'admin-2',
    email: 'coordinator@cares.local',
    password: 'admin123',
    firstName: 'Juan',
    lastName: 'Reyes',
    role: 'event_coordinator',
    requires2fa: true,
  },
];

export function authenticateAdmin(
  email: string,
  password: string,
): AdminUser | null {
  const normalized = email.trim().toLowerCase();
  const record = MOCK_ADMINS.find(
    (a) => a.email.toLowerCase() === normalized && a.password === password,
  );
  if (!record) return null;
  const { password: _, ...user } = record;
  return user;
}

export function findAdminByEmail(email: string): AdminUser | null {
  const normalized = email.trim().toLowerCase();
  const record = MOCK_ADMINS.find((a) => a.email.toLowerCase() === normalized);
  if (!record) return null;
  const { password: _, ...user } = record;
  return user;
}
