import {
  BeneficiaryType,
  RoleType,
} from '../../infastructures/prisma/common/client';

/**
 * Sides of a mobile account that are open besides the role it registered with,
 * without a role-access request. A student beneficiary proved their UC school ID
 * and face at sign-up — the same check the Volunteer side asks for — so that side
 * is open from the start. Every other side still unlocks the usual way.
 */
export function unlockedRoles(user: {
  roleType: RoleType;
  beneficiaryType: BeneficiaryType | null | undefined;
}): RoleType[] {
  if (
    user.roleType === RoleType.BENEFICIARY &&
    user.beneficiaryType === BeneficiaryType.STUDENT
  ) {
    return [RoleType.VOLUNTEER];
  }
  return [];
}
