import { ExecutionContext, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { RoleType } from '../../../../src/infastructures/prisma/common/client';
import { UsersSiteController } from '../../../../src/modules/users/controllers/users-site-controller';
import { UsersSiteService } from '../../../../src/modules/users/services/users-site-service';
import {
  BlockUserIpSchema,
  CheckProvisionEmailSchema,
  ProvisionUserSchema,
  ReissueCredentialsSchema,
} from '../../../../src/modules/users/validators/users-site-validator';
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

setCaseUnit({ module: 'Users Module', unit: 'Master — Accounts', prefix: 'USERS' });

/**
 * Shared by every spec in this folder — four POSTs on the portal's Master screen
 * (Manage Users):
 *   POST /api/v1/users                          (Create account: ProvisionUserSchema)
 *   POST /api/v1/users/check-email              (Check email: CheckProvisionEmailSchema)
 *   POST /api/v1/users/:id/reissue-credentials  (Reissue credentials: id uuid + ReissueCredentialsSchema)
 *   POST /api/v1/users/:id/block-ip             (Block IP: id uuid + BlockUserIpSchema)
 *
 * The id schema is a private const in the controller, so path-param fixtures run
 * through the API layer only. `@Roles` and `@RequirePermission` are not exercised:
 * the global guards are out of scope for these layers.
 *
 * Not a spec itself (no `-unit-spec.ts` suffix); attack strings still come only
 * from `config/security-payloads.ts`.
 */
export const VALID_USER_ID = 'b3f1c2d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d';
export const CALLER = { sub: 'caller-user-id', role_type: RoleType.ADMIN };

export const VALID_GENERATE = {
  mode: 'generate',
  recipient_email: 'new.staff@cares.ph',
  role_type: RoleType.COORDINATOR,
  expires_in_hours: 72,
};
export const VALID_MANUAL = { ...VALID_GENERATE, mode: 'manual', email: 'requester@cares.ph' };
export const VALID_CHECK = { email: 'new.staff@cares.ph' };
export const VALID_REISSUE = { expires_in_hours: 24 };
export const VALID_BLOCK = { ip_address: '203.0.113.10', reason: 'Repeated failed sign-ins' };

const MANAGED_USER = {
  user_id: VALID_USER_ID,
  firstname: 'New',
  lastname: 'Staff',
  email: 'new.staff@cares.local',
  role_type: RoleType.COORDINATOR,
  department: null,
  status: 'pending',
  credential_expires_at: '2026-11-05T08:00:00.000Z',
  restriction_reason: null,
  last_login_ip: null,
  blocked_ips: [],
  created_at: '2026-11-01T08:00:00.000Z',
};
export const PROVISIONED_RESPONSE = {
  user: MANAGED_USER,
  credentials: {
    email: MANAGED_USER.email,
    password: 'generated-password',
    expires_at: '2026-11-05T08:00:00.000Z',
  },
  delivery: { recipient: VALID_GENERATE.recipient_email, sent: true },
};
export const EMAIL_CHECK_RESPONSE = { email: VALID_CHECK.email, valid: true, reason: null };
export const BLOCKED_USER_RESPONSE = { ...MANAGED_USER, blocked_ips: [VALID_BLOCK.ip_address] };

export const CREATE_ENDPOINT = {
  schema: ProvisionUserSchema,
  path: () => '/api/v1/users',
  method: 'provisionUser',
  valid: VALID_GENERATE,
} as const;
export const CHECK_EMAIL_ENDPOINT = {
  schema: CheckProvisionEmailSchema,
  path: () => '/api/v1/users/check-email',
  method: 'checkRecipientEmail',
  valid: VALID_CHECK,
} as const;
export const REISSUE_ENDPOINT = {
  schema: ReissueCredentialsSchema,
  path: (id: string = VALID_USER_ID) => `/api/v1/users/${encodeURIComponent(id)}/reissue-credentials`,
  method: 'reissueCredentials',
  valid: VALID_REISSUE,
} as const;
export const BLOCK_IP_ENDPOINT = {
  schema: BlockUserIpSchema,
  path: (id: string = VALID_USER_ID) => `/api/v1/users/${encodeURIComponent(id)}/block-ip`,
  method: 'blockUserIp',
  valid: VALID_BLOCK,
} as const;

type UsersEndpoint =
  | typeof CREATE_ENDPOINT
  | typeof CHECK_EMAIL_ENDPOINT
  | typeof REISSUE_ENDPOINT
  | typeof BLOCK_IP_ENDPOINT;

/**
 * Boots `UsersSiteController` with a mocked service for the enclosing `describe`.
 * The handlers read the caller, so a stand-in for the global JWT guard puts
 * `CALLER` on the request. Read `app` inside tests — it is assigned in `beforeAll`.
 */
export const useUsersApp = () => {
  const ctx = {
    app: undefined as unknown as INestApplication,
    service: autoMock<UsersSiteService>(),
  };

  beforeAll(async () => {
    ctx.app = await createApiLayerApp({
      controllers: [UsersSiteController],
      providers: [
        { provide: UsersSiteService, useValue: ctx.service },
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
    ctx.service.provisionUser.mockReset().mockResolvedValue(PROVISIONED_RESPONSE as never);
    ctx.service.checkRecipientEmail.mockReset().mockResolvedValue(EMAIL_CHECK_RESPONSE as never);
    ctx.service.reissueCredentials.mockReset().mockResolvedValue(PROVISIONED_RESPONSE as never);
    ctx.service.blockUserIp.mockReset().mockResolvedValue(BLOCKED_USER_RESPONSE as never);
  });

  return ctx;
};

/**
 * Body fixtures through both layers. A FAIL must come back in the validation
 * envelope without reaching the service; a PASS must reach it exactly once.
 */
export const describeBodyTable = (
  ctx: ReturnType<typeof useUsersApp>,
  endpoint: UsersEndpoint,
  fixtures: LayerFixture[],
) => {
  fixtureCases(fixtures, (fixture) => {
    it('layer 1 — schema', async () => {
      expectLayer(await runSchemaLayer(endpoint.schema, fixture.input), fixture);
    });

    it('layer 2 — api', async () => {
      const outcome = await runApiLayer(ctx.app, { method: 'post', path: endpoint.path(), body: fixture.input });
      expectLayer(outcome, fixture);

      if (fixture.expected === 'FAIL') {
        expectValidationEnvelope(outcome);
        expect(ctx.service[endpoint.method]).not.toHaveBeenCalled();
      } else {
        expect(ctx.service[endpoint.method]).toHaveBeenCalledTimes(1);
      }
    });
  });
};

/**
 * User id fixtures (the fixture `input` is the raw id, URL-encoded into the path)
 * through the API layer, with a valid body so the id is the only thing under test.
 */
export const describeUserIdTable = (
  ctx: ReturnType<typeof useUsersApp>,
  endpoint: typeof REISSUE_ENDPOINT | typeof BLOCK_IP_ENDPOINT,
  fixtures: LayerFixture<string>[],
) => {
  fixtureCases(fixtures, (fixture) => {
    it('layer 2 — api', async () => {
      const outcome = await runApiLayer(ctx.app, {
        method: 'post',
        path: endpoint.path(fixture.input),
        body: endpoint.valid,
      });
      expectLayer(outcome, fixture);

      if (fixture.expected === 'FAIL') {
        expectValidationEnvelope(outcome);
        expect(ctx.service[endpoint.method]).not.toHaveBeenCalled();
      } else {
        expect(ctx.service[endpoint.method]).toHaveBeenCalledTimes(1);
      }
    });
  });
};
