import { PORTAL_ROLES } from '../constants/auth'
import { ADMIN_OVERVIEW_PATH } from '../constants/routes'
import type { PortalRole } from '../types/portal-roles'

/** All portal roles share the admin UI; access is gated per nav item. */
export function getPostLoginPath(_role: PortalRole): string {
  return ADMIN_OVERVIEW_PATH
}

export function isPortalRole(role: PortalRole): boolean {
  return PORTAL_ROLES.includes(role)
}

export { LOGIN_PATH } from '../constants/routes'
