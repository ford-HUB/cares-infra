import { STAFF_ROLES } from '../constants/auth'
import {
  DIRECTOR_OVERVIEW_PATH,
  STAFF_DASHBOARD_PATH,
} from '../constants/routes'
import type { PortalKind, StaffRole } from '../types/staff-roles'

export function getPortalForRole(role: StaffRole): PortalKind {
  return role === 'director' ? 'director' : 'staff'
}

export function getPostLoginPath(role: StaffRole): string {
  return role === 'director' ? DIRECTOR_OVERVIEW_PATH : STAFF_DASHBOARD_PATH
}

export function isStaffRole(role: StaffRole): boolean {
  return STAFF_ROLES.includes(role)
}

export { LOGIN_PATH } from '../constants/routes'
