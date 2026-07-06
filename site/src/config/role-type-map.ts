import type { StaffRole } from '../types/staff-roles'

export type PortalRoleType =
  | 'DIRECTOR'
  | 'STAFF'
  | 'COORDINATOR'
  | 'ASSISTANT_COORDINATOR'

const ROLE_TYPE_TO_STAFF_ROLE: Record<PortalRoleType, StaffRole> = {
  DIRECTOR: 'director',
  STAFF: 'staff',
  COORDINATOR: 'coordinator',
  ASSISTANT_COORDINATOR: 'assistant_coordinator',
}

export function isPortalRoleType(roleType: string): roleType is PortalRoleType {
  return roleType in ROLE_TYPE_TO_STAFF_ROLE
}

export function mapRoleTypeToStaffRole(roleType: string): StaffRole {
  if (isPortalRoleType(roleType)) {
    return ROLE_TYPE_TO_STAFF_ROLE[roleType]
  }
  return 'staff'
}
