import { RoleType } from '../../infastructures/prisma/common/client';

/** The role switcher is local (no new token), so volunteer-side routes accept all three. Portal roles excluded. */
export const MOBILE_ROLE_TYPES = [
  RoleType.VOLUNTEER,
  RoleType.DONOR,
  RoleType.BENEFICIARY,
] as const;

export type MobileRoleType = (typeof MOBILE_ROLE_TYPES)[number];

/** Portal roles allowed in the app, Volunteer side only; the token keeps the real role. */
export const MOBILE_STAFF_VOLUNTEER_ROLE_TYPES = [
  RoleType.DIRECTOR,
  RoleType.COORDINATOR,
] as const;

export const MOBILE_SIGN_IN_ROLE_TYPES = [
  ...MOBILE_ROLE_TYPES,
  ...MOBILE_STAFF_VOLUNTEER_ROLE_TYPES,
] as const;

export type MobileSignInRoleType = (typeof MOBILE_SIGN_IN_ROLE_TYPES)[number];

export function isStaffVolunteerRole(role: RoleType): boolean {
  return (MOBILE_STAFF_VOLUNTEER_ROLE_TYPES as readonly RoleType[]).includes(
    role,
  );
}

/** Staff land on the Volunteer side; null for roles the app doesn't serve. */
export function toMobileRole(role: RoleType): MobileRoleType | null {
  if (isStaffVolunteerRole(role)) return RoleType.VOLUNTEER;
  return (MOBILE_ROLE_TYPES as readonly RoleType[]).includes(role)
    ? (role as MobileRoleType)
    : null;
}
