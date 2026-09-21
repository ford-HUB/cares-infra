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
