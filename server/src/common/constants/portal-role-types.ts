import { RoleType } from "../../infastructures/prisma/common/client";

export const PORTAL_ROLE_TYPES = [
    RoleType.DIRECTOR,
    RoleType.STAFF,
    RoleType.COORDINATOR,
    RoleType.ASSISTANT_COORDINATOR,
] as const;

export type PortalRoleType = (typeof PORTAL_ROLE_TYPES)[number];

export function isPortalRole(role: RoleType): role is PortalRoleType {
    return (PORTAL_ROLE_TYPES as readonly RoleType[]).includes(role);
}
