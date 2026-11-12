import { ExecutionContext, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PermissionKey, RoleType } from '../../../../src/infastructures/prisma/common/client';
import { AccessControlSiteController } from '../../../../src/modules/access-control/controllers/access-control-site-controller';
import { AccessControlSiteService } from '../../../../src/modules/access-control/services/access-control-site-service';
import { SuspendActionsSchema } from '../../../../src/modules/access-control/validators/access-control-site-validator';
import {
  LayerFixture,
  autoMock,
  createApiLayerApp,
  expectLayer,
  expectValidationEnvelope,
  runApiLayer,
  runSchemaLayer,
} from '../../../config/layer-harness';
import { fixtureCases, setCaseUnit } from '../../../config/test-case';

setCaseUnit({ module: 'Access Control Module', unit: 'Suspend User Actions', prefix: 'ACCESS-CTL' });

/**
 * Shared by every spec in this folder — the Suspend action on the portal's Access
 * Control screen (Manage Users):
 *   POST /api/v1/access-control/users/:id/suspensions  (suspendActions: id uuid + SuspendActionsSchema)
 *
 * The id schema is a private const in the controller, so path-param fixtures run
 * through the API layer only. `@RequirePermission` is not exercised: the global
 * guards are out of scope for these layers.
 *
 * Not a spec itself (no `-unit-spec.ts` suffix); attack strings still come only
 * from `config/security-payloads.ts`.
 */
export const VALID_USER_ID = 'b3f1c2d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d';
export const CALLER = { sub: 'caller-user-id', role_type: RoleType.ADMIN };
export const ALL_PERMISSIONS = Object.values(PermissionKey);

export const suspendPath = (id: string = VALID_USER_ID) =>
  `/api/v1/access-control/users/${encodeURIComponent(id)}/suspensions`;

export const VALID_SUSPENSION = {
  permissions: [ALL_PERMISSIONS[0]],
  reason: 'Repeated misuse of this action on the portal.',
};
export const VALID_EXPIRY = '2099-01-01T00:00:00.000Z';

export const USER_DETAIL_RESPONSE = {
  user_id: VALID_USER_ID,
  firstname: 'Ada',
  lastname: 'Lovelace',
  email: 'ada@cares.ph',
  role_type: RoleType.COORDINATOR,
  department: null,
  is_restricted: false,
  is_protected: false,
  effective_permissions: [],
  granted_count: 0,
  revoked_count: 0,
  suspended_count: 1,
  latest_suspension_reason: VALID_SUSPENSION.reason,
  role_permissions: [ALL_PERMISSIONS[0]],
  overrides: [],
  suspensions: [
    {
      suspension_id: 'd4e5f6a7-b8c9-4d0e-8f1a-2b3c4d5e6f7a',
      permission: ALL_PERMISSIONS[0],
      reason: VALID_SUSPENSION.reason,
      issued_by_user_id: CALLER.sub,
      issued_at: '2026-11-01T08:00:00.000Z',
      expires_at: null,
      lifted_at: null,
      active: true,
    },
  ],
};

/**
 * Boots `AccessControlSiteController` with a mocked service for the enclosing
 * `describe`. The handler reads the caller, so a stand-in for the global JWT guard
 * puts `CALLER` on the request. Read `app` inside tests — it is assigned in
 * `beforeAll`.
 */
export const useAccessControlApp = () => {
  const ctx = {
    app: undefined as unknown as INestApplication,
    service: autoMock<AccessControlSiteService>(),
  };

  beforeAll(async () => {
    ctx.app = await createApiLayerApp({
      controllers: [AccessControlSiteController],
      providers: [
        { provide: AccessControlSiteService, useValue: ctx.service },
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
    ctx.service.suspendActions.mockReset().mockResolvedValue(USER_DETAIL_RESPONSE as never);
  });

  return ctx;
};

/**
 * Suspension body fixtures through both layers, against a valid user id. A FAIL
 * must come back in the validation envelope without reaching the service; a PASS
 * must reach it exactly once.
 */
export const describeSuspensionTable = (ctx: ReturnType<typeof useAccessControlApp>, fixtures: LayerFixture[]) => {
  fixtureCases(fixtures, (fixture) => {
    it('layer 1 — schema', async () => {
      expectLayer(await runSchemaLayer(SuspendActionsSchema, fixture.input), fixture);
    });

    it('layer 2 — api', async () => {
      const outcome = await runApiLayer(ctx.app, { method: 'post', path: suspendPath(), body: fixture.input });
      expectLayer(outcome, fixture);

      if (fixture.expected === 'FAIL') {
        expectValidationEnvelope(outcome);
        expect(ctx.service.suspendActions).not.toHaveBeenCalled();
      } else {
        expect(ctx.service.suspendActions).toHaveBeenCalledTimes(1);
      }
    });
  });
};

/**
 * User id fixtures (the fixture `input` is the raw id, URL-encoded into the path)
 * through the API layer, with a valid body so the id is the only thing under test.
 */
export const describeUserIdTable = (ctx: ReturnType<typeof useAccessControlApp>, fixtures: LayerFixture<string>[]) => {
  fixtureCases(fixtures, (fixture) => {
    it('layer 2 — api', async () => {
      const outcome = await runApiLayer(ctx.app, {
        method: 'post',
        path: suspendPath(fixture.input),
        body: VALID_SUSPENSION,
      });
      expectLayer(outcome, fixture);

      if (fixture.expected === 'FAIL') {
        expectValidationEnvelope(outcome);
        expect(ctx.service.suspendActions).not.toHaveBeenCalled();
      } else {
        expect(ctx.service.suspendActions).toHaveBeenCalledTimes(1);
      }
    });
  });
};
