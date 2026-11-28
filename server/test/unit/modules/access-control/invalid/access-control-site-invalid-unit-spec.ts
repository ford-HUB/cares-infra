import { RoleType } from '../../../../../src/infastructures/prisma/common/client';
import { LayerFixture } from '../../../../config/layer-harness';
import { asCase } from '../../../../config/test-case';
import {
  ACCESS_LIST_MAX_PAGE_SIZE,
  ALL_PERMISSIONS,
  CALLER,
  MESSAGES,
  NON_PORTAL_ROLES,
  PROTECTED_ADMIN,
  VALID_BASELINE,
  VALID_RIGHTS,
  VALID_SUSPENSION,
  VALID_SUSPENSION_ID,
  VALID_USER_ID,
  describeFieldTable,
  describeRoleTypeTable,
  describeSuspensionIdTable,
  describeUserIdTable,
  expectNothingChanged,
  expectRefusal,
  getUser,
  lift,
  storedSuspensionRecord,
  storedUser,
  suspend,
  updateBaseline,
  updateRights,
  useAccessControlApp,
} from '../access-control-site-support';

const malformedIds = (subject: string, id: string): LayerFixture<string>[] => [
  { name: `Admin ${subject} an id that is not a uuid`, input: 'user-1', expected: 'FAIL' },
  { name: `Admin ${subject} an id that is a plain number`, input: '42', expected: 'FAIL' },
  { name: `Admin ${subject} an id missing its last character`, input: id.slice(0, -1), expected: 'FAIL' },
  { name: `Admin ${subject} an id with an extra character`, input: `${id}0`, expected: 'FAIL' },
  { name: `Admin ${subject} an id without hyphens`, input: id.replace(/-/g, ''), expected: 'FAIL' },
  { name: `Admin ${subject} an id with surrounding spaces`, input: ` ${id} `, expected: 'FAIL' },
  { name: `Admin ${subject} an id with a non-hex character`, input: `${id.slice(0, -1)}g`, expected: 'FAIL' },
  { name: `Admin ${subject} a blank id`, input: ' ', expected: 'FAIL' },
];

/** `base` keeps the rest of the body valid. */
const permissionFixtures = (base: Record<string, unknown>): LayerFixture[] => [
  { name: 'Admin sends a right that does not exist (ALL)', input: { ...base, permissions: ['ALL'] }, expected: 'FAIL', field: 'permissions.0' },
  { name: 'Admin sends a right in lower case', input: { ...base, permissions: [ALL_PERMISSIONS[0].toLowerCase()] }, expected: 'FAIL', field: 'permissions.0' },
  { name: 'Admin sends a right by its label instead of its key (View events)', input: { ...base, permissions: ['View events'] }, expected: 'FAIL', field: 'permissions.0' },
  { name: 'Admin sends one unknown right among valid ones', input: { ...base, permissions: [ALL_PERMISSIONS[0], 'ALL'] }, expected: 'FAIL', field: 'permissions.1' },
  { name: 'Admin sends a single right as text instead of a list', input: { ...base, permissions: ALL_PERMISSIONS[0] }, expected: 'FAIL', field: 'permissions' },
  {
    name: `Admin sends ${ALL_PERMISSIONS.length + 1} rights, one more than exist`,
    input: { ...base, permissions: [...ALL_PERMISSIONS, ALL_PERMISSIONS[0]] },
    expected: 'FAIL',
    field: 'permissions',
  },
];

{
  const queryFixtures: LayerFixture[] = [
    { name: 'Admin searches with 121 characters', input: { search: 'a'.repeat(121) }, expected: 'FAIL', field: 'search' },
    { name: 'Admin filters by an app-side role (VOLUNTEER)', input: { role: 'VOLUNTEER' }, expected: 'FAIL', field: 'role' },
    { name: 'Admin filters by a role in lower case (director)', input: { role: 'director' }, expected: 'FAIL', field: 'role' },
    { name: 'Admin filters by "ALL" in upper case instead of "all"', input: { role: 'ALL' }, expected: 'FAIL', field: 'role' },
    { name: 'Admin sends an empty role filter', input: { role: '' }, expected: 'FAIL', field: 'role' },
    { name: 'Admin filters by a rights state that does not exist (restricted)', input: { rights: 'restricted' }, expected: 'FAIL', field: 'rights' },
    { name: 'Admin filters by a rights state with a capital letter (Suspended)', input: { rights: 'Suspended' }, expected: 'FAIL', field: 'rights' },
    { name: 'Admin sends an empty rights filter', input: { rights: '' }, expected: 'FAIL', field: 'rights' },
    { name: 'Admin opens page 0', input: { page: '0' }, expected: 'FAIL', field: 'page' },
    { name: 'Admin opens a negative page', input: { page: '-1' }, expected: 'FAIL', field: 'page' },
    { name: 'Admin opens a fractional page', input: { page: '1.5' }, expected: 'FAIL', field: 'page' },
    { name: 'Admin types the page as a word (two)', input: { page: 'two' }, expected: 'FAIL', field: 'page' },
    { name: 'Admin sends an empty page', input: { page: '' }, expected: 'FAIL', field: 'page' },
    { name: 'Admin shows 0 users per page', input: { page_size: '0' }, expected: 'FAIL', field: 'page_size' },
    {
      name: `Admin shows ${ACCESS_LIST_MAX_PAGE_SIZE + 1} users per page, one over the maximum`,
      input: { page_size: String(ACCESS_LIST_MAX_PAGE_SIZE + 1) },
      expected: 'FAIL',
      field: 'page_size',
    },
    { name: 'Admin types the page size as a word (ten)', input: { page_size: 'ten' }, expected: 'FAIL', field: 'page_size' },
    { name: 'Client sends a query parameter the list does not take (sort)', input: { sort: 'name' }, expected: 'FAIL' },
  ];

  describe('access control site — List users field validation', () => {
    const ctx = useAccessControlApp();

    describe('GET /api/v1/access-control/users', () => {
      describe('query', () => describeFieldTable(ctx, 'list', queryFixtures));
    });
  });
}

{
  describe('access control site — User detail field validation', () => {
    const ctx = useAccessControlApp();

    describe('GET /api/v1/access-control/users/:id', () => {
      describe('id', () => describeUserIdTable(ctx, 'detail', malformedIds('opens the rights of', VALID_USER_ID)));

      describe('id', () => {
        asCase('invalid', 'Admin opens the rights of a well-formed id that belongs to no user', `Detail fails with "${MESSAGES.userNotFound}" (404)`).it(
          'refuses an unknown user',
          async () => {
            ctx.repository.findUser.mockResolvedValue(null as never);
            expectRefusal(await getUser(ctx), 404, MESSAGES.userNotFound);
          },
        );

        asCase('invalid', `Admin opens the rights of an app-side account (${NON_PORTAL_ROLES.length} variants)`, `Detail fails with "${MESSAGES.notPortalUser}" (400)`).it.each(
          NON_PORTAL_ROLES,
        )('refuses a %s', async (role) => {
          ctx.repository.findUser.mockResolvedValue(storedUser({ role }) as never);
          expectRefusal(await getUser(ctx), 400, MESSAGES.notPortalUser);
        });
      });
    });
  });
}

{
  const bodyFixtures: LayerFixture[] = [
    { name: 'Admin saves without the rights list', input: { reason: VALID_RIGHTS.reason }, expected: 'FAIL', field: 'permissions' },
    ...permissionFixtures(VALID_RIGHTS),
    { name: 'Admin writes a reason of 501 characters', input: { ...VALID_RIGHTS, reason: 'a'.repeat(501) }, expected: 'FAIL', field: 'reason' },
    { name: 'Client sends a field the rights form does not take (effect)', input: { ...VALID_RIGHTS, effect: 'GRANT' }, expected: 'FAIL' },
    // Reaches the notification and audit trail, so it follows the suspension-reason rule.
  ];

  describe('access control site — Update user rights field validation', () => {
    const ctx = useAccessControlApp();

    describe('PATCH /api/v1/access-control/users/:id/permissions', () => {
      describe('id', () => describeUserIdTable(ctx, 'rights', malformedIds('saves the rights of', VALID_USER_ID)));

      describe('id', () => {
        asCase('invalid', 'Admin saves the rights of a well-formed id that belongs to no user', `Update fails with "${MESSAGES.userNotFound}" (404); nothing is changed`).it(
          'refuses an unknown user',
          async () => {
            ctx.repository.findUser.mockResolvedValue(null as never);
            expectRefusal(await updateRights(ctx, VALID_RIGHTS), 404, MESSAGES.userNotFound);
            expectNothingChanged(ctx);
          },
        );

        asCase('invalid', `Admin saves the rights of an app-side account (${NON_PORTAL_ROLES.length} variants)`, `Update fails with "${MESSAGES.notPortalUser}" (400); nothing is changed`).it.each(
          NON_PORTAL_ROLES,
        )('refuses a %s', async (role) => {
          ctx.repository.findUser.mockResolvedValue(storedUser({ role }) as never);
          expectRefusal(await updateRights(ctx, VALID_RIGHTS), 400, MESSAGES.notPortalUser);
          expectNothingChanged(ctx);
        });

        asCase('invalid', 'Admin changes their own rights', `Update fails with "${MESSAGES.ownRights}" (400); nothing is changed`).it(
          'refuses the caller as the target',
          async () => {
            ctx.repository.findUser.mockResolvedValue(storedUser({ userId: CALLER.sub, role: RoleType.ADMIN }) as never);
            expectRefusal(await updateRights(ctx, VALID_RIGHTS, CALLER.sub), 400, MESSAGES.ownRights);
            expectNothingChanged(ctx);
          },
        );
      });

      describe('body', () => describeFieldTable(ctx, 'rights', bodyFixtures));
    });
  });
}

{
  const bodyFixtures: LayerFixture[] = [
    { name: 'Admin suspends without the actions list', input: { reason: VALID_SUSPENSION.reason }, expected: 'FAIL', field: 'permissions' },
    {
      name: 'Admin suspends with no action selected',
      input: { ...VALID_SUSPENSION, permissions: [] },
      expected: 'FAIL',
      field: 'permissions',
      message: MESSAGES.atLeastOneAction,
    },
    ...permissionFixtures(VALID_SUSPENSION),
    { name: 'Admin suspends without a reason', input: { permissions: VALID_SUSPENSION.permissions }, expected: 'FAIL', field: 'reason' },
    { name: 'Admin suspends with an empty reason', input: { ...VALID_SUSPENSION, reason: '' }, expected: 'FAIL', field: 'reason', message: MESSAGES.reasonMin },
    { name: 'Admin suspends with a reason of only spaces', input: { ...VALID_SUSPENSION, reason: ' '.repeat(12) }, expected: 'FAIL', field: 'reason', message: MESSAGES.reasonMin },
    { name: 'Admin writes a reason of 9 characters, one under the minimum', input: { ...VALID_SUSPENSION, reason: 'a'.repeat(9) }, expected: 'FAIL', field: 'reason', message: MESSAGES.reasonMin },
    { name: 'Admin writes a reason of 501 characters', input: { ...VALID_SUSPENSION, reason: 'a'.repeat(501) }, expected: 'FAIL', field: 'reason' },

    {
      name: 'Admin pastes a form-feed character into the reason',
      input: { ...VALID_SUSPENSION, reason: 'Deleted events\u000Cwithout approval.' },
      expected: 'FAIL',
      field: 'reason',
      message: MESSAGES.controlCharacters,
    },
    {
      name: 'Admin pastes a delete character into the reason',
      input: { ...VALID_SUSPENSION, reason: `${VALID_SUSPENSION.reason}\u007F` },
      expected: 'FAIL',
      field: 'reason',
      message: MESSAGES.controlCharacters,
    },
    { name: 'Admin sends an empty expiry', input: { ...VALID_SUSPENSION, expires_at: '' }, expected: 'FAIL', field: 'expires_at' },
    { name: 'Admin sets an expiry as a date without a time', input: { ...VALID_SUSPENSION, expires_at: '2099-01-01' }, expected: 'FAIL', field: 'expires_at' },
    { name: 'Admin sets an expiry with a local offset (+08:00)', input: { ...VALID_SUSPENSION, expires_at: '2099-01-01T08:00:00+08:00' }, expected: 'FAIL', field: 'expires_at' },
    { name: 'Admin sets an expiry in a month that does not exist (13)', input: { ...VALID_SUSPENSION, expires_at: '2099-13-01T00:00:00.000Z' }, expected: 'FAIL', field: 'expires_at' },
    { name: 'Admin sets an expiry on a day that does not exist (30 February)', input: { ...VALID_SUSPENSION, expires_at: '2099-02-30T00:00:00.000Z' }, expected: 'FAIL', field: 'expires_at' },
    { name: 'Admin sets an expiry in day/month/year form', input: { ...VALID_SUSPENSION, expires_at: '01/01/2099' }, expected: 'FAIL', field: 'expires_at' },
    { name: 'Admin sends the expiry as a timestamp number', input: { ...VALID_SUSPENSION, expires_at: 4070908800000 }, expected: 'FAIL', field: 'expires_at' },
    { name: 'Client sends "permission" instead of "permissions"', input: { permission: VALID_SUSPENSION.permissions, reason: VALID_SUSPENSION.reason }, expected: 'FAIL', field: 'permissions' },
  ];

  describe('access control site — Suspend actions field validation', () => {
    const ctx = useAccessControlApp();

    describe('POST /api/v1/access-control/users/:id/suspensions', () => {
      describe('id', () => describeUserIdTable(ctx, 'suspend', malformedIds('suspends actions of', VALID_USER_ID)));

      describe('id', () => {
        asCase('invalid', 'Admin suspends actions of a well-formed id that belongs to no user', `Suspend fails with "${MESSAGES.userNotFound}" (404); nothing is changed`).it(
          'refuses an unknown user',
          async () => {
            ctx.repository.findUser.mockResolvedValue(null as never);
            expectRefusal(await suspend(ctx, VALID_SUSPENSION), 404, MESSAGES.userNotFound);
            expectNothingChanged(ctx);
          },
        );

        asCase('invalid', `Admin suspends actions of an app-side account (${NON_PORTAL_ROLES.length} variants)`, `Suspend fails with "${MESSAGES.notPortalUser}" (400); nothing is changed`).it.each(
          NON_PORTAL_ROLES,
        )('refuses a %s', async (role) => {
          ctx.repository.findUser.mockResolvedValue(storedUser({ role }) as never);
          expectRefusal(await suspend(ctx, VALID_SUSPENSION), 400, MESSAGES.notPortalUser);
          expectNothingChanged(ctx);
        });

        asCase('invalid', 'Admin suspends their own actions', `Suspend fails with "${MESSAGES.ownSuspension}" (400); nothing is changed`).it(
          'refuses the caller as the target',
          async () => {
            ctx.repository.findUser.mockResolvedValue(storedUser({ userId: CALLER.sub, role: RoleType.ADMIN }) as never);
            expectRefusal(await suspend(ctx, VALID_SUSPENSION, CALLER.sub), 400, MESSAGES.ownSuspension);
            expectNothingChanged(ctx);
          },
        );

        asCase('invalid', 'Admin suspends actions of the root administrator account', `Suspend fails with "${MESSAGES.protectedAdmin}" (403); nothing is changed`).it(
          'refuses the protected admin',
          async () => {
            ctx.repository.findUser.mockResolvedValue(PROTECTED_ADMIN() as never);
            expectRefusal(await suspend(ctx, VALID_SUSPENSION), 403, MESSAGES.protectedAdmin);
            expectNothingChanged(ctx);
          },
        );
      });

      describe('body', () => describeFieldTable(ctx, 'suspend', bodyFixtures));

      describe('expires_at', () => {
        asCase('invalid', 'Admin sets an expiry that has already passed', `Suspend fails with "${MESSAGES.pastExpiry}" (400); nothing is changed`).it(
          'refuses a past expiry',
          async () => {
            expectRefusal(await suspend(ctx, { ...VALID_SUSPENSION, expires_at: '2020-01-01T00:00:00.000Z' }), 400, MESSAGES.pastExpiry);
            expectNothingChanged(ctx);
          },
        );
      });
    });
  });
}

{
  describe('access control site — Lift suspension field validation', () => {
    const ctx = useAccessControlApp();

    describe('DELETE /api/v1/access-control/users/:id/suspensions/:suspensionId', () => {
      describe('id', () => describeUserIdTable(ctx, 'lift', malformedIds('lifts a suspension of', VALID_USER_ID)));
      describe('suspensionId', () => describeSuspensionIdTable(ctx, malformedIds('lifts a suspension by', VALID_SUSPENSION_ID)));

      describe('id', () => {
        asCase('invalid', 'Admin lifts a suspension of a well-formed id that belongs to no user', `Lift fails with "${MESSAGES.userNotFound}" (404); nothing is changed`).it(
          'refuses an unknown user',
          async () => {
            ctx.repository.findUser.mockResolvedValue(null as never);
            expectRefusal(await lift(ctx), 404, MESSAGES.userNotFound);
            expectNothingChanged(ctx);
          },
        );
      });

      describe('suspensionId', () => {
        asCase('invalid', 'Admin lifts a well-formed suspension id that does not exist', `Lift fails with "${MESSAGES.suspensionNotFound}" (404); nothing is changed`).it(
          'refuses an unknown suspension',
          async () => {
            ctx.repository.findSuspension.mockResolvedValue(null as never);
            expectRefusal(await lift(ctx), 404, MESSAGES.suspensionNotFound);
            expectNothingChanged(ctx);
          },
        );

        asCase('invalid', "Admin lifts another user's suspension through this user's address", `Lift fails with "${MESSAGES.suspensionNotFound}" (404); nothing is changed`).it(
          'refuses a suspension that belongs to someone else',
          async () => {
            ctx.repository.findSuspension.mockResolvedValue(storedSuspensionRecord({ user_id: CALLER.sub }) as never);
            expectRefusal(await lift(ctx), 404, MESSAGES.suspensionNotFound);
            expectNothingChanged(ctx);
          },
        );

        asCase('invalid', 'Admin lifts a suspension that was already lifted', `Lift fails with "${MESSAGES.alreadyLifted}" (400); nothing is changed`).it(
          'refuses an already lifted suspension',
          async () => {
            ctx.repository.findSuspension.mockResolvedValue(storedSuspensionRecord({ lifted_at: new Date('2026-11-02T00:00:00.000Z') }) as never);
            expectRefusal(await lift(ctx), 400, MESSAGES.alreadyLifted);
            expectNothingChanged(ctx);
          },
        );
      });
    });
  });
}

{
  const roleTypeFixtures: LayerFixture<string>[] = [
    { name: 'Admin edits the baseline of an app-side role (VOLUNTEER)', input: RoleType.VOLUNTEER, expected: 'FAIL' },
    { name: 'Admin edits the baseline of an app-side role (DONOR)', input: RoleType.DONOR, expected: 'FAIL' },
    { name: 'Admin edits the baseline of an app-side role (BENEFICIARY)', input: RoleType.BENEFICIARY, expected: 'FAIL' },
    { name: 'Admin edits a role in lower case (director)', input: 'director', expected: 'FAIL' },
    { name: 'Admin edits a role that does not exist (MANAGER)', input: 'MANAGER', expected: 'FAIL' },
    { name: 'Admin edits the "all" role filter as if it were a role', input: 'all', expected: 'FAIL' },
  ];

  const bodyFixtures: LayerFixture[] = [
    { name: 'Admin saves a baseline without the rights list', input: {}, expected: 'FAIL', field: 'permissions' },
    ...permissionFixtures({}),
    { name: 'Client sends a reason, which the baseline does not take', input: { ...VALID_BASELINE, reason: 'Quarterly review' }, expected: 'FAIL' },
  ];

  describe('access control site — Update role baseline field validation', () => {
    const ctx = useAccessControlApp();

    describe('PATCH /api/v1/access-control/roles/:roleType/permissions', () => {
      describe('roleType', () => describeRoleTypeTable(ctx, roleTypeFixtures));

      describe('roleType', () => {
        asCase('invalid', 'Admin edits the ADMIN baseline', `Update fails with "${MESSAGES.adminBaseline}" (400); nothing is changed`).it(
          'refuses the fixed admin baseline',
          async () => {
            expectRefusal(await updateBaseline(ctx, RoleType.ADMIN, VALID_BASELINE), 400, MESSAGES.adminBaseline);
            expectNothingChanged(ctx);
          },
        );
      });

      describe('body', () => describeFieldTable(ctx, 'baseline', bodyFixtures));
    });
  });
}
