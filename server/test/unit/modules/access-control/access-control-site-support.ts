import { ExecutionContext, INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PermissionKey, RoleType } from '../../../../src/infastructures/prisma/common/client';
import { AccessControlSiteController } from '../../../../src/modules/access-control/controllers/access-control-site-controller';
import { AccessControlRepository } from '../../../../src/modules/access-control/repositories/access-control-repository';
import { AccessControlSiteService } from '../../../../src/modules/access-control/services/access-control-site-service';
import {
  ACCESS_LIST_MAX_PAGE_SIZE,
  ListAccessUsersQuerySchema,
  SuspendActionsSchema,
  UpdateRolePermissionsSchema,
  UpdateUserPermissionsSchema,
} from '../../../../src/modules/access-control/validators/access-control-site-validator';
import { AuditLogRecorder } from '../../../../src/modules/audit-logs/services/audit-log-recorder';
import { NotificationScheduler } from '../../../../src/schedulers/jobs/notification-scheduler';
import { DEFAULT_PROTECTED_ADMIN_EMAIL } from '../../../../src/shared/constants/protected-admin';
import {
  LayerFixture,
  LayerOutcome,
  autoMock,
  createApiLayerApp,
  expectLayer,
  expectSafeErrorEnvelope,
  expectValidationEnvelope,
  runApiLayer,
  runSchemaLayer,
} from '../../../config/layer-harness';
import { fixtureCases, setCaseUnit } from '../../../config/test-case';
import { ZodType } from 'zod';

setCaseUnit({ module: 'Access Control Module', unit: 'Manage User & Role Rights', prefix: 'ACCESS-CTL' });

/**
 * Real controller + service, so service refusals are production code; only the
 * repository, ConfigService, AuditLogRecorder and NotificationScheduler are mocked.
 * Id schemas are private to the controller, so id cases are API-layer only.
 */
export const CALLER = {
  sub: '0f8e7d6c-5b4a-4c3d-8e2f-1a0b9c8d7e6f',
  email: 'director@cares.ph',
  role_type: RoleType.ADMIN,
};
export const VALID_USER_ID = 'b3f1c2d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d';
export const VALID_SUSPENSION_ID = 'd4e5f6a7-b8c9-4d0e-8f1a-2b3c4d5e6f7a';
const CREATED_AT = new Date('2026-11-01T08:00:00.000Z');

export const ALL_PERMISSIONS = Object.values(PermissionKey);
export const PORTAL_ROLES = [RoleType.ADMIN, RoleType.DIRECTOR, RoleType.COORDINATOR];
export const NON_PORTAL_ROLES = [RoleType.VOLUNTEER, RoleType.DONOR, RoleType.BENEFICIARY];
export { ACCESS_LIST_MAX_PAGE_SIZE };

export const USERS_PATH = '/api/v1/access-control/users';
export const userPath = (id: string = VALID_USER_ID) => `${USERS_PATH}/${encodeURIComponent(id)}`;
export const rightsPath = (id: string = VALID_USER_ID) => `${userPath(id)}/permissions`;
export const suspendPath = (id: string = VALID_USER_ID) => `${userPath(id)}/suspensions`;
export const liftPath = (id: string = VALID_USER_ID, suspensionId: string = VALID_SUSPENSION_ID) =>
  `${suspendPath(id)}/${encodeURIComponent(suspensionId)}`;
export const baselinePath = (roleType: string) =>
  `/api/v1/access-control/roles/${encodeURIComponent(roleType)}/permissions`;

export const VALID_RIGHTS = {
  permissions: [PermissionKey.EVENTS_VIEW, PermissionKey.EVENTS_CREATE],
  reason: 'Covers event intake while the coordinator is on leave.',
};
export const VALID_SUSPENSION = {
  permissions: [PermissionKey.EVENTS_DELETE],
  reason: 'Deleted three published events without approval.',
};
export const VALID_BASELINE = { permissions: [PermissionKey.EVENTS_VIEW, PermissionKey.CHAT_ACCESS] };
export const VALID_EXPIRY = '2099-01-01T00:00:00.000Z';

/** Exact refusals the real code sends. */
export const MESSAGES = {
  userId: 'A valid user id is required',
  suspensionId: 'A valid suspension id is required',
  atLeastOneAction: 'Select at least one action to suspend',
  reasonMin: 'Describe the violation in at least 10 characters',
  controlCharacters: 'Reason cannot contain control characters',
  userNotFound: 'User not found',
  notPortalUser: 'Only portal accounts carry feature rights',
  ownRights: 'You cannot change your own rights',
  ownSuspension: 'You cannot suspend your own actions',
  protectedAdmin: 'The root administrator account cannot have its actions suspended',
  pastExpiry: 'The expiry must be in the future',
  adminBaseline: 'The admin baseline is fixed — admins hold every right by definition',
  suspensionNotFound: 'Suspension not found',
  alreadyLifted: 'That suspension has already been lifted',
};

export interface StoredSuspension {
  user_action_suspension_id: string;
  permission: PermissionKey;
  reason: string;
  issued_by_user_id: string;
  expires_at: Date | null;
  lifted_at: Date | null;
  createdAt: Date;
}

export const storedSuspension = (overrides: Partial<StoredSuspension> = {}): StoredSuspension => ({
  user_action_suspension_id: VALID_SUSPENSION_ID,
  permission: PermissionKey.EVENTS_DELETE,
  reason: VALID_SUSPENSION.reason,
  issued_by_user_id: CALLER.sub,
  expires_at: null,
  lifted_at: null,
  createdAt: CREATED_AT,
  ...overrides,
});

/** `findUser` row; a portal coordinator by default. */
export const storedUser = (
  overrides: { role?: RoleType; userId?: string; email?: string; suspensions?: StoredSuspension[] } = {},
) => ({
  user_id: overrides.userId ?? VALID_USER_ID,
  firstname: 'Ada',
  lastname: 'Lovelace',
  portal_department: 'College of Nursing',
  accounts: [{ email: overrides.email ?? 'ada@cares.ph', is_restricted: false }],
  role: { type: overrides.role ?? RoleType.COORDINATOR },
  permission_overrides: [],
  action_suspensions: overrides.suspensions ?? [],
});

/** `findSuspension` row: the suspension plus its owner. */
export const storedSuspensionRecord = (overrides: Partial<StoredSuspension> & { user_id?: string } = {}) => ({
  ...storedSuspension(overrides),
  user_id: overrides.user_id ?? VALID_USER_ID,
});

/**
 * A stub guard sets `CALLER`. Mocks reset to the happy path before each test:
 * target is another non-root coordinator, baselines use the catalog, writes succeed.
 */
export const useAccessControlApp = () => {
  const ctx = {
    app: undefined as unknown as INestApplication,
    repository: autoMock<AccessControlRepository>(),
    config: autoMock<ConfigService>(),
    audit: autoMock<AuditLogRecorder>(),
    notifications: autoMock<NotificationScheduler>(),
  };

  beforeAll(async () => {
    ctx.app = await createApiLayerApp({
      controllers: [AccessControlSiteController],
      providers: [
        AccessControlSiteService,
        { provide: AccessControlRepository, useValue: ctx.repository },
        { provide: ConfigService, useValue: ctx.config },
        { provide: AuditLogRecorder, useValue: ctx.audit },
        { provide: NotificationScheduler, useValue: ctx.notifications },
        {
          provide: APP_GUARD,
          useValue: {
            canActivate: (context: ExecutionContext) => {
              context.switchToHttp().getRequest().user = CALLER;
              return true;
            },
          },
        },
      ],
    });
  });
  afterAll(() => ctx.app.close());

  beforeEach(() => {
    ctx.repository.listUsers.mockReset().mockResolvedValue({ rows: [storedUser()], total: 1 } as never);
    ctx.repository.findUser.mockReset().mockResolvedValue(storedUser() as never);
    ctx.repository.findRoleDefaults.mockReset().mockResolvedValue([] as never);
    ctx.repository.findAllRoleDefaults.mockReset().mockResolvedValue([] as never);
    ctx.repository.replaceUserOverrides.mockReset().mockResolvedValue(undefined as never);
    ctx.repository.replaceRoleDefaults.mockReset().mockResolvedValue(undefined as never);
    ctx.repository.createSuspensions.mockReset().mockResolvedValue(undefined as never);
    ctx.repository.findSuspension.mockReset().mockResolvedValue(storedSuspensionRecord() as never);
    ctx.repository.liftSuspension.mockReset().mockResolvedValue(undefined as never);
    ctx.config.get.mockReset().mockReturnValue(undefined as never);
    ctx.audit.record.mockReset().mockResolvedValue(undefined as never);
    ctx.notifications.publish.mockReset().mockResolvedValue(undefined as never);
  });

  return ctx;
};

export type AccessCtx = ReturnType<typeof useAccessControlApp>;

/** Root admin, by the default protected email. */
export const PROTECTED_ADMIN = () => storedUser({ role: RoleType.ADMIN, email: DEFAULT_PROTECTED_ADMIN_EMAIL });

export const listUsers = (ctx: AccessCtx, query?: Record<string, string>) =>
  runApiLayer(ctx.app, { method: 'get', path: USERS_PATH, query });
export const getUser = (ctx: AccessCtx, id = VALID_USER_ID) => runApiLayer(ctx.app, { method: 'get', path: userPath(id) });
export const updateRights = (ctx: AccessCtx, body: unknown, id = VALID_USER_ID) =>
  runApiLayer(ctx.app, { method: 'patch', path: rightsPath(id), body });
export const suspend = (ctx: AccessCtx, body: unknown, id = VALID_USER_ID) =>
  runApiLayer(ctx.app, { method: 'post', path: suspendPath(id), body });
export const lift = (ctx: AccessCtx, id = VALID_USER_ID, suspensionId = VALID_SUSPENSION_ID) =>
  runApiLayer(ctx.app, { method: 'delete', path: liftPath(id, suspensionId) });
export const updateBaseline = (ctx: AccessCtx, roleType: string, body: unknown) =>
  runApiLayer(ctx.app, { method: 'patch', path: baselinePath(roleType), body });

export const expectRefusal = (outcome: LayerOutcome, status: number, message: string) => {
  expect(outcome.status).toBe(status);
  expectSafeErrorEnvelope(outcome);
  expect(outcome.body.message).toBe(message);
};

export const expectNothingChanged = (ctx: AccessCtx) => {
  expect(ctx.repository.replaceUserOverrides).not.toHaveBeenCalled();
  expect(ctx.repository.replaceRoleDefaults).not.toHaveBeenCalled();
  expect(ctx.repository.createSuspensions).not.toHaveBeenCalled();
  expect(ctx.repository.liftSuspension).not.toHaveBeenCalled();
  expect(ctx.audit.record).not.toHaveBeenCalled();
  expect(ctx.notifications.publish).not.toHaveBeenCalled();
};

type BodyRoute = 'list' | 'rights' | 'suspend' | 'baseline';

const SCHEMAS: Record<BodyRoute, ZodType> = {
  list: ListAccessUsersQuerySchema,
  rights: UpdateUserPermissionsSchema,
  suspend: SuspendActionsSchema,
  baseline: UpdateRolePermissionsSchema,
};

const send = (ctx: AccessCtx, route: BodyRoute, input: any) => {
  switch (route) {
    case 'list':
      return listUsers(ctx, input);
    case 'rights':
      return updateRights(ctx, input);
    case 'suspend':
      return suspend(ctx, input);
    case 'baseline':
      return updateBaseline(ctx, RoleType.COORDINATOR, input);
  }
};

/** The first repository call each route makes once its input is valid. */
const reached = (ctx: AccessCtx, route: BodyRoute) => {
  switch (route) {
    case 'list':
      return ctx.repository.listUsers;
    case 'rights':
      return ctx.repository.replaceUserOverrides;
    case 'suspend':
      return ctx.repository.createSuspensions;
    case 'baseline':
      return ctx.repository.replaceRoleDefaults;
  }
};

/** FAIL: validation envelope, nothing read or written. PASS: reaches the route once. */
export const describeFieldTable = (ctx: AccessCtx, route: BodyRoute, fixtures: LayerFixture[]) => {
  fixtureCases(fixtures, (fixture) => {
    it('layer 1 — schema', async () => {
      expectLayer(await runSchemaLayer(SCHEMAS[route], fixture.input), fixture);
    });

    it('layer 2 — api', async () => {
      const outcome = await send(ctx, route, fixture.input);
      expectLayer(outcome, fixture);

      if (fixture.expected === 'FAIL') {
        expectValidationEnvelope(outcome);
        expect(ctx.repository.findUser).not.toHaveBeenCalled();
        expect(ctx.repository.listUsers).not.toHaveBeenCalled();
        expectNothingChanged(ctx);
      } else {
        expect(outcome.status).toBeLessThan(300);
        expect(reached(ctx, route)).toHaveBeenCalledTimes(1);
      }
    });
  });
};

type IdRoute = 'detail' | 'rights' | 'suspend' | 'lift';

/** `input` is the raw id (URL-encoded); the body stays valid so only the id is tested. */
export const describeUserIdTable = (ctx: AccessCtx, route: IdRoute, fixtures: LayerFixture<string>[]) => {
  fixtureCases(fixtures, (fixture) => {
    it('layer 2 — api', async () => {
      const outcome =
        route === 'detail'
          ? await getUser(ctx, fixture.input)
          : route === 'rights'
            ? await updateRights(ctx, VALID_RIGHTS, fixture.input)
            : route === 'suspend'
              ? await suspend(ctx, VALID_SUSPENSION, fixture.input)
              : await lift(ctx, fixture.input);
      expectLayer(outcome, fixture);

      if (fixture.expected === 'FAIL') {
        expectValidationEnvelope(outcome);
        expect(outcome.body.errors).toEqual(
          expect.arrayContaining([expect.objectContaining({ message: MESSAGES.userId })]),
        );
        expect(ctx.repository.findUser).not.toHaveBeenCalled();
        expectNothingChanged(ctx);
      } else {
        expect(outcome.status).toBeLessThan(300);
        expect(ctx.repository.findUser).toHaveBeenCalled();
      }
    });
  });
};

/** Suspension-id fixtures for Lift, against a valid user id. */
export const describeSuspensionIdTable = (ctx: AccessCtx, fixtures: LayerFixture<string>[]) => {
  fixtureCases(fixtures, (fixture) => {
    it('layer 2 — api', async () => {
      const outcome = await lift(ctx, VALID_USER_ID, fixture.input);
      expectLayer(outcome, fixture);

      if (fixture.expected === 'FAIL') {
        expectValidationEnvelope(outcome);
        expect(outcome.body.errors).toEqual(
          expect.arrayContaining([expect.objectContaining({ message: MESSAGES.suspensionId })]),
        );
        expect(ctx.repository.findSuspension).not.toHaveBeenCalled();
        expectNothingChanged(ctx);
      } else {
        expect(outcome.status).toBe(200);
        expect(ctx.repository.liftSuspension).toHaveBeenCalledTimes(1);
      }
    });
  });
};

/** roleType fixtures for the Baseline route, with a valid body. */
export const describeRoleTypeTable = (ctx: AccessCtx, fixtures: LayerFixture<string>[]) => {
  fixtureCases(fixtures, (fixture) => {
    it('layer 2 — api', async () => {
      const outcome = await updateBaseline(ctx, fixture.input, VALID_BASELINE);
      expectLayer(outcome, fixture);

      if (fixture.expected === 'FAIL') {
        expectValidationEnvelope(outcome);
        expectNothingChanged(ctx);
      } else {
        expect(outcome.status).toBe(200);
        expect(ctx.repository.replaceRoleDefaults).toHaveBeenCalledTimes(1);
      }
    });
  });
};
