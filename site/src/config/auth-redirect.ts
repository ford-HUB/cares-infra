import { PORTAL_ROLES } from '../constants/auth'
import { ADMIN_OVERVIEW_PATH } from '../constants/routes'
import type { PortalRole } from '../types/portal-roles'

/** Every portal role shares the admin UI; access differs per nav item, not per portal. */
export function getPostLoginPath(_role: PortalRole): string {
  return ADMIN_OVERVIEW_PATH
}

export function isPortalRole(role: PortalRole): boolean {
  return PORTAL_ROLES.includes(role)
}

export { LOGIN_PATH } from '../constants/routes'
