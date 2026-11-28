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
import { asCase, fixtureCases, setCaseUnit } from '../../../config/test-case';

setCaseUnit({ module: 'Users Module', unit: 'Master — Accounts', prefix: 'USERS' });

/** The id schema is private to the controller, so path-param cases are API-layer only. */
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

/** Stub guard sets `CALLER` (the handlers read it); `app` is assigned in `beforeAll`. */
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

/** FAIL: validation envelope, service untouched. PASS: service called once. */
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

/** `name` is the Test Case Description; a FAIL also names the field and exact message. */
export interface FieldCase<TInput = unknown> extends LayerFixture<TInput> {
  field?: string;
  message?: string;
}

/** The Zod message for a value outside an enum, e.g. `Invalid option: expected one of "a"|"b"`. */
export const oneOf = (values: readonly string[]) =>
  `Invalid option: expected one of ${values.map((value) => `"${value}"`).join('|')}`;

const fieldExpected = (fixture: FieldCase<unknown>) => {
  if (fixture.expected === 'PASS') {
    return 'PASS — request accepted (201) and passed to the service once';
  }
  const issue = fixture.field !== undefined ? `: ${fixture.field || '(body)'} — "${fixture.message}"` : '';
  return `FAIL — request rejected with "Validation failed" (400)${issue}; the service is never reached`;
};

/** Each fixture is its own case (PASS in valid/, FAIL in invalid/), checked on both layers. */
export const fieldBodyCases = (
  ctx: ReturnType<typeof useUsersApp>,
  endpoint: UsersEndpoint,
  fixtures: FieldCase[],
) => {
  for (const fixture of fixtures) {
    const kind = fixture.expected === 'PASS' ? 'valid' : 'invalid';

    asCase(kind, fixture.name, fieldExpected(fixture)).it.each(['layer 1 — schema', 'layer 2 — api'])(
      '%s',
      async (layer) => {
        if (layer === 'layer 1 — schema') {
          expectLayer(await runSchemaLayer(endpoint.schema, fixture.input), fixture);
          return;
        }

        const outcome = await runApiLayer(ctx.app, { method: 'post', path: endpoint.path(), body: fixture.input });
        expectLayer(outcome, fixture);
        if (fixture.expected === 'FAIL') {
          expectValidationEnvelope(outcome);
          expect(ctx.service[endpoint.method]).not.toHaveBeenCalled();
        } else {
          expect(outcome.status).toBe(201);
          expect(ctx.service[endpoint.method]).toHaveBeenCalledTimes(1);
        }
      },
    );
  }
};

/** `:id` with a valid body; API layer only, as the id schema is private to the controller. */
export const fieldUserIdCases = (
  ctx: ReturnType<typeof useUsersApp>,
  endpoint: typeof REISSUE_ENDPOINT | typeof BLOCK_IP_ENDPOINT,
  fixtures: FieldCase<string>[],
) => {
  for (const fixture of fixtures) {
    const kind = fixture.expected === 'PASS' ? 'valid' : 'invalid';
    const expected =
      fixture.expected === 'PASS'
        ? fieldExpected(fixture)
        : `FAIL — request rejected with "Validation failed" (400): id — "${fixture.message}"; the service is never reached`;

    asCase(kind, fixture.name, expected).it('layer 2 — api', async () => {
      const outcome = await runApiLayer(ctx.app, {
        method: 'post',
        path: endpoint.path(fixture.input),
        body: endpoint.valid,
      });
      expectLayer(outcome, { ...fixture, field: undefined });
      if (fixture.expected === 'FAIL') {
        expectValidationEnvelope(outcome);
        expect(outcome.issues.map((issue) => issue.message)).toContain(fixture.message);
        expect(ctx.service[endpoint.method]).not.toHaveBeenCalled();
      } else {
        expect(outcome.status).toBe(201);
        expect(ctx.service[endpoint.method]).toHaveBeenCalledTimes(1);
      }
    });
  }
};

/** `input` is the raw id (URL-encoded); the body stays valid so only the id is tested. */
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
