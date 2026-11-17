import { unlockedRoles } from './unlocked-roles';

// The generated client is ESM, which Jest cannot load; only the enum values the
// rule compares against are needed here.
jest.mock('../../infastructures/prisma/common/client', () => ({
  RoleType: {
    VOLUNTEER: 'VOLUNTEER',
    BENEFICIARY: 'BENEFICIARY',
    DONOR: 'DONOR',
  },
  BeneficiaryType: { REGULAR: 'REGULAR', STUDENT: 'STUDENT' },
}));

describe('unlockedRoles', () => {
  it('opens the Volunteer side of a student beneficiary', () => {
    expect(
      unlockedRoles({
        roleType: 'BENEFICIARY',
        beneficiaryType: 'STUDENT',
      }),
    ).toEqual(['VOLUNTEER']);
  });

  it('opens nothing extra for a regular beneficiary', () => {
    expect(
      unlockedRoles({
        roleType: 'BENEFICIARY',
        beneficiaryType: 'REGULAR',
      }),
    ).toEqual([]);
  });

  it('opens nothing extra for a beneficiary from before the split', () => {
    expect(
      unlockedRoles({
        roleType: 'BENEFICIARY',
        beneficiaryType: null,
      }),
    ).toEqual([]);
  });

  it('opens nothing extra for volunteers or donors', () => {
    for (const roleType of ['VOLUNTEER', 'DONOR']) {
      expect(
        unlockedRoles({
          roleType: roleType,
          beneficiaryType: 'STUDENT',
        }),
      ).toEqual([]);
    }
  });
});
