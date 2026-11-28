import {
  BeneficiaryType,
  RoleType,
} from '../../infastructures/prisma/common/client';

/** A student beneficiary passed the ID and face check at sign-up, so the Volunteer side opens immediately. */
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
