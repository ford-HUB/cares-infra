import { RoleType } from '../../infastructures/prisma/common/client';

/**
 * Roles the Flutter app signs in as. The app's role switcher is local — one
 * account registered as a beneficiary or donor can open the volunteer
 * dashboard without a new token — so every mobile route the volunteer side
 * calls (events feed, registrations, attendance, evaluation, certificates,
 * rankings) accepts all three rather than only the role the JWT was minted
 * with. Portal roles stay out.
 */
export const MOBILE_ROLE_TYPES = [
  RoleType.VOLUNTEER,
  RoleType.DONOR,
  RoleType.BENEFICIARY,
] as const;

export type MobileRoleType = (typeof MOBILE_ROLE_TYPES)[number];

/**
 * Portal roles that may also sign in to the app with their portal credentials,
 * where they only ever get the Volunteer side. Their token keeps the real role,
 * so nothing on the portal changes for them.
 */
export const MOBILE_STAFF_VOLUNTEER_ROLE_TYPES = [
  RoleType.DIRECTOR,
  RoleType.COORDINATOR,
] as const;

/** Every role the app's volunteer-side routes accept. */
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

/** The app side an account lands on — staff open the Volunteer side. Null for roles the app does not serve. */
export function toMobileRole(role: RoleType): MobileRoleType | null {
  if (isStaffVolunteerRole(role)) return RoleType.VOLUNTEER;
  return (MOBILE_ROLE_TYPES as readonly RoleType[]).includes(role)
    ? (role as MobileRoleType)
    : null;
}
