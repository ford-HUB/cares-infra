import { RoleType } from '../../../../../src/infastructures/prisma/common/client';
import { LayerFixture } from '../../../../config/layer-harness';
import { asCase } from '../../../../config/test-case';
import {
  ACCESS_LIST_MAX_PAGE_SIZE,
  ALL_PERMISSIONS,
  PORTAL_ROLES,
  VALID_BASELINE,
  VALID_EXPIRY,
  VALID_RIGHTS,
  VALID_SUSPENSION,
  VALID_SUSPENSION_ID,
  VALID_USER_ID,
  describeFieldTable,
  describeRoleTypeTable,
  describeSuspensionIdTable,
  describeUserIdTable,
  getUser,
  lift,
  listUsers,
  storedSuspensionRecord,
  storedUser,
  suspend,
  updateBaseline,
  updateRights,
  useAccessControlApp,
} from '../access-control-site-support';

const userIdFixtures = (action: string): LayerFixture<string>[] => [
  { name: `Admin ${action} a user by their id`, input: VALID_USER_ID, expected: 'PASS' },
  { name: `Admin ${action} a user whose id is in upper case`, input: VALID_USER_ID.toUpperCase(), expected: 'PASS' },
];

{
  const queryFixtures: LayerFixture[] = [
    { name: 'Admin opens the user list with no filters', input: {}, expected: 'PASS' },
    { name: 'Admin searches by a first name', input: { search: 'Ada' }, expected: 'PASS' },
    { name: 'Admin searches by an email address', input: { search: 'ada@cares.ph' }, expected: 'PASS' },
    { name: "Admin searches for a name with an apostrophe and hyphen (O'Brien-Santos)", input: { search: "O'Brien-Santos" }, expected: 'PASS' },
    { name: 'Admin searches with exactly 120 characters', input: { search: 'a'.repeat(120) }, expected: 'PASS' },
    { name: 'Admin picks "all" for role and rights', input: { role: 'all', rights: 'all' }, expected: 'PASS' },
    { name: 'Admin opens page 1', input: { page: '1' }, expected: 'PASS' },
    { name: 'Admin opens a later page (7)', input: { page: '7' }, expected: 'PASS' },
    { name: 'Admin shows 1 user per page', input: { page_size: '1' }, expected: 'PASS' },
    {
      name: `Admin shows the maximum of ${ACCESS_LIST_MAX_PAGE_SIZE} users per page`,
      input: { page_size: String(ACCESS_LIST_MAX_PAGE_SIZE) },
      expected: 'PASS',
    },
    {
      name: 'Admin combines search, role, rights, page and page size',
      input: { search: 'Ada', role: 'COORDINATOR', rights: 'customised', page: '2', page_size: '50' },
      expected: 'PASS',
    },
  ];

  describe('access control site — List users field validation', () => {
    const ctx = useAccessControlApp();

    describe('GET /api/v1/access-control/users', () => {
      describe('query', () => describeFieldTable(ctx, 'list', queryFixtures));

      describe('role', () => {
        asCase('valid', `Admin filters the list by each portal role (${PORTAL_ROLES.length} variants)`, 'User list returned (200) with only that role requested').it.each(
          PORTAL_ROLES,
        )('accepts %s', async (role) => {
          const outcome = await listUsers(ctx, { role });
          expect(outcome.status).toBe(200);
          expect(ctx.repository.listUsers).toHaveBeenCalledWith(expect.objectContaining({ role }));
        });
      });

      describe('rights', () => {
        asCase('valid', 'Admin filters the list by each rights state (3 variants)', 'User list returned (200) with only that rights state requested').it.each(
          ['all', 'customised', 'suspended'],
        )('accepts %s', async (rights) => {
          const outcome = await listUsers(ctx, { rights });
          expect(outcome.status).toBe(200);
          expect(ctx.repository.listUsers).toHaveBeenCalledWith(expect.objectContaining({ rights }));
        });
      });
    });
  });
}

{
  describe('access control site — User detail field validation', () => {
    const ctx = useAccessControlApp();

    describe('GET /api/v1/access-control/users/:id', () => {
      describe('id', () => describeUserIdTable(ctx, 'detail', userIdFixtures('opens the rights of')));

      describe('id', () => {
        asCase('valid', `Admin opens the rights of a user of each portal role (${PORTAL_ROLES.length} variants)`, 'Access rights returned (200) for that user').it.each(
          PORTAL_ROLES,
        )('accepts a %s', async (role) => {
          ctx.repository.findUser.mockResolvedValue(storedUser({ role }) as never);
          const outcome = await getUser(ctx);
          expect(outcome.status).toBe(200);
          expect(outcome.body.data).toEqual(expect.objectContaining({ user_id: VALID_USER_ID, role_type: role }));
        });
      });
    });
  });
}

{
  const bodyFixtures: LayerFixture[] = [
    { name: 'Admin saves a set of rights with a reason', input: VALID_RIGHTS, expected: 'PASS' },
    { name: 'Admin saves a set of rights without a reason', input: { permissions: VALID_RIGHTS.permissions }, expected: 'PASS' },
    { name: 'Admin saves one right', input: { permissions: [ALL_PERMISSIONS[0]] }, expected: 'PASS' },
    { name: 'Admin removes every right (empty list)', input: { permissions: [] }, expected: 'PASS' },
    { name: `Admin grants every right (${ALL_PERMISSIONS.length})`, input: { permissions: ALL_PERMISSIONS }, expected: 'PASS' },
    { name: 'Admin leaves the optional reason empty', input: { ...VALID_RIGHTS, reason: '' }, expected: 'PASS' },
    { name: 'Admin writes a reason of exactly 500 characters', input: { ...VALID_RIGHTS, reason: 'a'.repeat(500) }, expected: 'PASS' },
    { name: 'Admin writes a reason over several lines', input: { ...VALID_RIGHTS, reason: 'Covering intake.\nUntil 30 Nov.' }, expected: 'PASS' },
  ];

  describe('access control site — Update user rights field validation', () => {
    const ctx = useAccessControlApp();

    describe('PATCH /api/v1/access-control/users/:id/permissions', () => {
      describe('id', () => describeUserIdTable(ctx, 'rights', userIdFixtures('saves the rights of')));
      describe('body', () => describeFieldTable(ctx, 'rights', bodyFixtures));

      describe('id', () => {
        asCase('valid', `Admin saves the rights of a user of each portal role (${PORTAL_ROLES.length} variants)`, 'Access rights updated (200) and saved for that user').it.each(
          PORTAL_ROLES,
        )('accepts a %s', async (role) => {
          ctx.repository.findUser.mockResolvedValue(storedUser({ role }) as never);
          const outcome = await updateRights(ctx, VALID_RIGHTS);
          expect(outcome.status).toBe(200);
          expect(ctx.repository.replaceUserOverrides).toHaveBeenCalledWith(VALID_USER_ID, expect.any(Array), expect.any(String));
        });
      });
    });
  });
}

{
  const bodyFixtures: LayerFixture[] = [
    { name: 'Admin suspends one action with a reason', input: VALID_SUSPENSION, expected: 'PASS' },
    { name: 'Admin suspends several actions', input: { ...VALID_SUSPENSION, permissions: ALL_PERMISSIONS.slice(0, 3) }, expected: 'PASS' },
    { name: `Admin suspends every action (${ALL_PERMISSIONS.length})`, input: { ...VALID_SUSPENSION, permissions: ALL_PERMISSIONS }, expected: 'PASS' },
    { name: 'Admin writes a reason of exactly 10 characters', input: { ...VALID_SUSPENSION, reason: 'a'.repeat(10) }, expected: 'PASS' },
    { name: 'Admin writes a reason of exactly 500 characters', input: { ...VALID_SUSPENSION, reason: 'a'.repeat(500) }, expected: 'PASS' },
    { name: 'Admin writes a reason over several lines', input: { ...VALID_SUSPENSION, reason: 'Deleted events.\nNo approval on file.' }, expected: 'PASS' },
    { name: "Admin writes a reason with quotes and punctuation", input: { ...VALID_SUSPENSION, reason: `Removed "Coastal Clean-up" (published) — no sign-off.` }, expected: 'PASS' },
    { name: 'Admin sets a future expiry date and time', input: { ...VALID_SUSPENSION, expires_at: VALID_EXPIRY }, expected: 'PASS' },
    { name: 'Admin sets a future expiry without milliseconds', input: { ...VALID_SUSPENSION, expires_at: '2099-06-30T16:00:00Z' }, expected: 'PASS' },
  ];

  describe('access control site — Suspend actions field validation', () => {
    const ctx = useAccessControlApp();

    describe('POST /api/v1/access-control/users/:id/suspensions', () => {
      describe('id', () => describeUserIdTable(ctx, 'suspend', userIdFixtures('suspends actions of')));
      describe('body', () => describeFieldTable(ctx, 'suspend', bodyFixtures));

      describe('id', () => {
        asCase(
          'valid',
          'Admin suspends actions of a director, a coordinator and a non-root admin (3 variants)',
          'Actions suspended (201) and saved for that user',
        ).it.each(PORTAL_ROLES)('accepts a %s', async (role) => {
          ctx.repository.findUser.mockResolvedValue(storedUser({ role }) as never);
          const outcome = await suspend(ctx, VALID_SUSPENSION);
          expect(outcome.status).toBe(201);
          expect(ctx.repository.createSuspensions).toHaveBeenCalledWith(
            expect.objectContaining({ userId: VALID_USER_ID, permissions: VALID_SUSPENSION.permissions, reason: VALID_SUSPENSION.reason }),
          );
        });
      });

      describe('expires_at', () => {
        asCase('valid', 'Admin sets a future expiry', 'Actions suspended (201) with that expiry saved').it('saves the expiry', async () => {
          const outcome = await suspend(ctx, { ...VALID_SUSPENSION, expires_at: VALID_EXPIRY });
          expect(outcome.status).toBe(201);
          expect(ctx.repository.createSuspensions).toHaveBeenCalledWith(expect.objectContaining({ expiresAt: new Date(VALID_EXPIRY) }));
        });

        asCase('valid', 'Admin leaves the expiry out', 'Actions suspended (201) with no expiry (until lifted)').it('saves no expiry', async () => {
          const outcome = await suspend(ctx, VALID_SUSPENSION);
          expect(outcome.status).toBe(201);
          expect(ctx.repository.createSuspensions).toHaveBeenCalledWith(expect.objectContaining({ expiresAt: null }));
        });
      });
    });
  });
}

{
  describe('access control site — Lift suspension field validation', () => {
    const ctx = useAccessControlApp();

    describe('DELETE /api/v1/access-control/users/:id/suspensions/:suspensionId', () => {
      describe('id', () =>
        describeUserIdTable(ctx, 'lift', [{ name: 'Admin lifts a suspension of a user by their id', input: VALID_USER_ID, expected: 'PASS' }]));

      describe('suspensionId', () =>
        describeSuspensionIdTable(ctx, [
          { name: 'Admin lifts a suspension by its id', input: VALID_SUSPENSION_ID, expected: 'PASS' },
          { name: 'Admin lifts a suspension whose id is in upper case', input: VALID_SUSPENSION_ID.toUpperCase(), expected: 'PASS' },
        ]));

      describe('suspensionId', () => {
        asCase('valid', 'Admin lifts a suspension whose expiry has already passed', 'Suspension lifted (200) and recorded as lifted by the caller').it(
          'lifts an expired suspension',
          async () => {
            ctx.repository.findSuspension.mockResolvedValue(storedSuspensionRecord({ expires_at: new Date('2026-01-01T00:00:00.000Z') }) as never);
            const outcome = await lift(ctx);
            expect(outcome.status).toBe(200);
            expect(ctx.repository.liftSuspension).toHaveBeenCalledWith(VALID_SUSPENSION_ID, expect.any(String));
          },
        );
      });
    });
  });
}

{
  const bodyFixtures: LayerFixture[] = [
    { name: 'Admin saves a role baseline of several rights', input: VALID_BASELINE, expected: 'PASS' },
    { name: 'Admin saves a role baseline of one right', input: { permissions: [ALL_PERMISSIONS[0]] }, expected: 'PASS' },
    { name: 'Admin clears a role baseline (empty list)', input: { permissions: [] }, expected: 'PASS' },
    { name: `Admin gives a role every right (${ALL_PERMISSIONS.length})`, input: { permissions: ALL_PERMISSIONS }, expected: 'PASS' },
  ];

  describe('access control site — Update role baseline field validation', () => {
    const ctx = useAccessControlApp();

    describe('PATCH /api/v1/access-control/roles/:roleType/permissions', () => {
      describe('roleType', () =>
        describeRoleTypeTable(ctx, [
          { name: 'Admin edits the DIRECTOR baseline', input: RoleType.DIRECTOR, expected: 'PASS' },
          { name: 'Admin edits the COORDINATOR baseline', input: RoleType.COORDINATOR, expected: 'PASS' },
        ]));

      describe('body', () => describeFieldTable(ctx, 'baseline', bodyFixtures));

      describe('permissions', () => {
        asCase('valid', 'Admin saves a role baseline', 'Role baseline updated (200) and saved with exactly those rights').it(
          'saves the baseline',
          async () => {
            const outcome = await updateBaseline(ctx, RoleType.DIRECTOR, VALID_BASELINE);
            expect(outcome.status).toBe(200);
            expect(ctx.repository.replaceRoleDefaults).toHaveBeenCalledWith(RoleType.DIRECTOR, expect.arrayContaining(VALID_BASELINE.permissions));
            expect(outcome.body.data).toEqual({ role_type: RoleType.DIRECTOR, permissions: expect.arrayContaining(VALID_BASELINE.permissions) });
          },
        );
      });
    });
  });
}
