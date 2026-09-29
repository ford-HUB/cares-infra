import type { PortalRole } from '../types/portal-roles'

export type PortalRoleType = 'ADMIN' | 'DIRECTOR' | 'COORDINATOR'

const ROLE_TYPE_TO_PORTAL_ROLE: Record<PortalRoleType, PortalRole> = {
  ADMIN: 'admin',
  DIRECTOR: 'director',
  COORDINATOR: 'coordinator',
}

export function isPortalRoleType(roleType: string): roleType is PortalRoleType {
  return roleType in ROLE_TYPE_TO_PORTAL_ROLE
}

export function mapRoleTypeToPortalRole(roleType: string): PortalRole {
  if (isPortalRoleType(roleType)) {
    return ROLE_TYPE_TO_PORTAL_ROLE[roleType]
  }
  return 'coordinator'
}
