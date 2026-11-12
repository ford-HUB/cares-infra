import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Agent } from 'node:http';
import request from 'supertest';
import { ZodType } from 'zod';
import { RoleType } from '../../../../../src/infastructures/prisma/common/client';
import { JwtService } from '../../../../../src/infastructures/jwt/jwt-service';
import { NodemailerService } from '../../../../../src/infastructures/nodemailer/nodemailer-service';
import { RedisService } from '../../../../../src/infastructures/redis/redis-service';
import { AccessControlSiteService } from '../../../../../src/modules/access-control/services/access-control-site-service';
import { AuditLogRecorder } from '../../../../../src/modules/audit-logs/services/audit-log-recorder';
import { AuthSiteController } from '../../../../../src/modules/auth/controllers/auth-site-controller';
import { AuthRepository } from '../../../../../src/modules/auth/repositories/auth-repository';
import { AuthSiteService } from '../../../../../src/modules/auth/services/auth-site-service';
import {
  AccessRequestSchema,
  LoginSchema,
  PortalForgotPasswordSchema,
} from '../../../../../src/modules/auth/validators/auth-site-validator';
import { LoginActivityRepository } from '../../../../../src/modules/login-activity/repositories/login-activity-repository';
import { LoginActivityRecorder } from '../../../../../src/modules/login-activity/services/login-activity-recorder';
import { LoginPolicyEnforcer } from '../../../../../src/modules/security-policy/services/login-policy-enforcer';
import {
  DEFAULT_SECURITY_POLICY,
  SecurityPolicyService,
} from '../../../../../src/modules/security-policy/services/security-policy-service';
import { SessionRegistry } from '../../../../../src/modules/sessions/services/session-registry';
import { TemplateUtils } from '../../../../../src/shared/utils/templete-utils';
import {
  LayerOutcome,
  autoMock,
  createApiLayerApp,
  expectLayer,
  expectValidationEnvelope,
  runApiLayer,
  runSchemaLayer,
  withPollution,
} from '../../../../config/layer-harness';
import { SecurityPayload } from '../../../../config/security-payloads';

/**
 * Shared by every spec under `auth/login/{valid,invalid}/` — the Portal Login
 * screen, its Forgot Password modal and the Request Access screen beside it:
 *
 *   POST /api/v1/auth/admin/login            Login           (LoginSchema)
 *   POST /api/v1/auth/admin/forgot-password  Forgot Password (PortalForgotPasswordSchema)
 *   POST /api/v1/auth/access-request         Request Access  (AccessRequestSchema, multipart)
 *
 * The app runs the REAL `AuthSiteController`, `AuthSiteService` and
 * `LoginPolicyEnforcer` — bcrypt compare, role gate, credential expiry,
 * restriction, blocked network, lockout, reset cooldown and attachment rules are
 * all production code. Only data access, mail, Redis, sessions and JWT signing
 * are mocked, so nothing touches a database or sends a real email.
 */
export const MODULE = 'Authentication Module';

export const LOGIN_PATH = '/api/v1/auth/admin/login';
export const FORGOT_PATH = '/api/v1/auth/admin/forgot-password';
export const ACCESS_REQUEST_PATH = '/api/v1/auth/access-request';

export const VALID_LOGIN = { email: 'admin@cares.ph', password: 'Str0ng!Passw0rd' };
export const VALID_FORGOT = { email: 'admin@cares.ph' };
export const VALID_ACCESS_REQUEST = {
  from_email: 'volunteer@cares.ph',
  subject: 'Coordinator access request',
  body: 'Requesting coordinator access for the CCS department outreach.',
};
/** Keeps a body payload above the 20-character minimum so length is never the reason it fails. */
export const BODY_PREFIX = 'Requesting coordinator access:';
export const ACCESS_REQUEST_RECIPIENT = 'admin-inbox@cares.ph';

/** The reply every credential failure shares, so it never reveals which part was wrong. */
export const INVALID_CREDENTIALS = 'Invalid email or password';

/** Low cost keeps the suite fast; the compare path is identical to production. */
export const hashOf = (password: string) => bcrypt.hashSync(password, 4);
export const PASSWORD_HASH = hashOf(VALID_LOGIN.password);

export interface StoredAccount {
  email: string;
  password: string | null;
  credential_expires_at: Date | null;
  email_verified_at: Date | null;
  is_restricted: boolean;
  restriction_reason: string | null;
  user: {
    user_id: string;
    firstname: string;
    lastname: string;
    role: { type: RoleType };
    user_interest: { user_interest_id: string } | null;
  };
}

/** The row `AuthRepository.findAccountForLogin` returns — an ADMIN with `VALID_LOGIN`'s password. */
export const storedAccount = (overrides: Partial<StoredAccount> = {}, role: RoleType = RoleType.ADMIN): StoredAccount => ({
  email: VALID_LOGIN.email,
  password: PASSWORD_HASH,
  credential_expires_at: null,
  email_verified_at: new Date('2026-01-01T00:00:00Z'),
  is_restricted: false,
  restriction_reason: null,
  user: {
    user_id: 'user-1',
    firstname: 'Ada',
    lastname: 'Lovelace',
    role: { type: role },
    user_interest: null,
  },
  ...overrides,
});

export const PORTAL_ROLES = [RoleType.ADMIN, RoleType.DIRECTOR, RoleType.COORDINATOR];
export const NON_PORTAL_ROLES = [RoleType.VOLUNTEER, RoleType.DONOR, RoleType.BENEFICIARY];

const CONFIG: Record<string, string> = { ACCESS_REQUEST_EMAIL: ACCESS_REQUEST_RECIPIENT };

/**
 * Boots the auth site controller on the real service for the enclosing `describe`
 * and restores every mock to the "registered ADMIN, nothing blocked" default before
 * each test. Read `ctx.app` inside tests — it is assigned in `beforeAll`.
 */
export const useAuthSiteApp = () => {
  const ctx = {
    app: undefined as unknown as INestApplication,
    repository: autoMock<AuthRepository>(),
    activity: autoMock<LoginActivityRecorder>(),
    activityRepository: autoMock<LoginActivityRepository>(),
    sessions: autoMock<SessionRegistry>(),
    jwt: autoMock<JwtService>(),
    audit: autoMock<AuditLogRecorder>(),
    accessControl: autoMock<AccessControlSiteService>(),
    securityPolicy: autoMock<SecurityPolicyService>(),
    redis: autoMock<RedisService>(),
    config: autoMock<ConfigService>(),
    mailer: autoMock<NodemailerService>(),
  };

  beforeAll(async () => {
    ctx.app = await createApiLayerApp({
      controllers: [AuthSiteController],
      providers: [
        AuthSiteService,
        LoginPolicyEnforcer,
        { provide: AuthRepository, useValue: ctx.repository },
        { provide: LoginActivityRecorder, useValue: ctx.activity },
        { provide: LoginActivityRepository, useValue: ctx.activityRepository },
        { provide: SessionRegistry, useValue: ctx.sessions },
        { provide: JwtService, useValue: ctx.jwt },
        { provide: AuditLogRecorder, useValue: ctx.audit },
        { provide: AccessControlSiteService, useValue: ctx.accessControl },
        { provide: SecurityPolicyService, useValue: ctx.securityPolicy },
        { provide: RedisService, useValue: ctx.redis },
        { provide: ConfigService, useValue: ctx.config },
        { provide: NodemailerService, useValue: ctx.mailer },
      ],
    });
  });
  afterAll(() => ctx.app.close());

  beforeEach(() => {
    ctx.repository.findBlockedIp.mockReset().mockResolvedValue(null as never);
    ctx.repository.findAccountForLogin.mockReset().mockResolvedValue(storedAccount() as never);
    ctx.repository.recordLoginIp.mockReset().mockResolvedValue(undefined as never);
    ctx.repository.updatePasswordByEmail.mockReset().mockResolvedValue(undefined as never);
    ctx.activity.record.mockReset().mockResolvedValue(undefined as never);
    ctx.activityRepository.summarizeRecentAttempts
      .mockReset()
      .mockResolvedValue({ failures: 0, lastFailureAt: null } as never);
    ctx.audit.record.mockReset().mockResolvedValue(undefined as never);
    ctx.sessions.create.mockReset().mockResolvedValue({ session_id: 'session-1' } as never);
    ctx.jwt.sign.mockReset().mockReturnValue('signed-token' as never);
    ctx.accessControl.sessionRightsFor.mockReset().mockResolvedValue({ permissions: [], suspensions: [] } as never);
    ctx.securityPolicy.getPolicy.mockReset().mockResolvedValue({ ...DEFAULT_SECURITY_POLICY } as never);
    ctx.redis.get.mockReset().mockResolvedValue(null as never);
    ctx.redis.ttl.mockReset().mockResolvedValue(-2 as never);
    ctx.redis.set.mockReset().mockResolvedValue(undefined as never);
    ctx.config.get.mockReset().mockImplementation(((key: string) => CONFIG[key]) as never);
    ctx.mailer.sendEmail.mockReset().mockResolvedValue(undefined as never);
  });

  beforeAll(() => {
    jest.spyOn(TemplateUtils, 'compileTemplate').mockResolvedValue('<p>temporary password</p>');
  });
  afterAll(() => jest.restoreAllMocks());

  return ctx;
};

export type AuthSiteCtx = ReturnType<typeof useAuthSiteApp>;

/**
 * One endpoint under test: its schema (layer 1), its path (layer 2), and the mock
 * that only gets called once a request has passed validation — used to prove an
 * invalid input never reached the business logic.
 */
export interface Endpoint {
  schema: ZodType;
  path: string;
  reached: (ctx: AuthSiteCtx) => jest.Mock;
}

export const LOGIN: Endpoint = {
  schema: LoginSchema,
  path: LOGIN_PATH,
  reached: (ctx) => ctx.repository.findAccountForLogin as unknown as jest.Mock,
};
export const FORGOT: Endpoint = {
  schema: PortalForgotPasswordSchema,
  path: FORGOT_PATH,
  reached: (ctx) => ctx.repository.findAccountForLogin as unknown as jest.Mock,
};
export const ACCESS_REQUEST: Endpoint = {
  schema: AccessRequestSchema,
  path: ACCESS_REQUEST_PATH,
  reached: (ctx) => ctx.mailer.sendEmail as unknown as jest.Mock,
};

export const post = (ctx: AuthSiteCtx, path: string, body: unknown, headers?: Record<string, string>) =>
  runApiLayer(ctx.app, { method: 'post', path, body, headers });

/* ───────────────────────── checks reused by cases ───────────────────────── */

/** Asserts both layers refuse `input`: Zod reports `field`, the API answers 400 and stops before the service. */
const expectRejectedByValidation = async (ctx: AuthSiteCtx, endpoint: Endpoint, input: unknown, field?: string) => {
  const fixture = { name: '', input, expected: 'FAIL' as const, field };
  expectLayer(await runSchemaLayer(endpoint.schema, input), fixture);

  const outcome = await post(ctx, endpoint.path, input);
  expectLayer(outcome, fixture);
  expectValidationEnvelope(outcome);
  expect(endpoint.reached(ctx)).not.toHaveBeenCalled();
};

/** Two checks: layer 1 — schema, layer 2 — API. */
export const rejectsByValidation = (ctx: AuthSiteCtx, endpoint: Endpoint, input: unknown, field?: string) => {
  it('layer 1 — schema rejects the input', async () => {
    expectLayer(await runSchemaLayer(endpoint.schema, input), { name: '', input, expected: 'FAIL', field });
  });
  it('layer 2 — api answers 400 "Validation failed" and nothing reaches the service', async () => {
    const outcome = await post(ctx, endpoint.path, input);
    expectLayer(outcome, { name: '', input, expected: 'FAIL', field });
    expectValidationEnvelope(outcome);
    expect(endpoint.reached(ctx)).not.toHaveBeenCalled();
  });
};

/** One check per payload variant, each running both layers. */
export const rejectsEachByValidation = (
  ctx: AuthSiteCtx,
  endpoint: Endpoint,
  payloads: SecurityPayload[],
  build: (value: unknown) => unknown,
  field?: string,
) => {
  it.each(payloads.map((p) => ({ label: p.label, value: p.value })))('$label', async ({ value }) => {
    await expectRejectedByValidation(ctx, endpoint, build(value), field);
  });
};

/** `__proto__` / `constructor.prototype` sent as raw JSON is refused and `Object.prototype` stays clean. */
export const rejectsPrototypePollution = (
  ctx: AuthSiteCtx,
  endpoint: Endpoint,
  valid: object,
  payloads: SecurityPayload[],
) => {
  it.each(payloads.map((p) => ({ label: p.label, value: p.value as string })))('$label', async ({ value }) => {
    const outcome = await runApiLayer(ctx.app, { method: 'post', path: endpoint.path, rawBody: withPollution(valid, value) });
    expect(outcome.verdict).toBe('FAIL');
    expectValidationEnvelope(outcome);
    expect(endpoint.reached(ctx)).not.toHaveBeenCalled();
    expect(({} as any).isAdmin).toBeUndefined();
  });
};

/** Layer 1 accepts the input as-is. */
export const acceptedBySchema = (endpoint: Endpoint, input: unknown) => {
  it('layer 1 — schema accepts the input', async () => {
    expectLayer(await runSchemaLayer(endpoint.schema, input), { name: '', input, expected: 'PASS' });
  });
};

/** Refused by the service with exactly this status and message, in the safe error envelope. */
export const expectRefusal = (outcome: LayerOutcome, status: number, message: string) => {
  expect(outcome.status).toBe(status);
  expect(outcome.body).toEqual({ ok: false, message });
};

/* ───────────────────────── multipart (Request Access) ───────────────────────── */

export interface Upload {
  filename: string;
  contentType: string;
  buffer: Buffer;
}

export const upload = (filename: string, contentType: string, bytes: number): Upload => ({
  filename,
  contentType,
  buffer: Buffer.alloc(bytes, 1),
});

const keepAliveAgent = new Agent({ keepAlive: true });

/** Posts the Request Access form the way the portal does: multipart fields plus `attachments`. */
export const postAccessRequest = async (
  ctx: AuthSiteCtx,
  fields: Record<string, string>,
  files: Upload[] = [],
): Promise<LayerOutcome> => {
  let req = request(ctx.app.getHttpServer()).post(ACCESS_REQUEST_PATH).agent(keepAliveAgent);
  for (const [key, value] of Object.entries(fields)) req = req.field(key, value);
  for (const file of files) {
    req = req.attach('attachments', file.buffer, { filename: file.filename, contentType: file.contentType });
  }
  const res = await req;
  return {
    layer: 'api',
    verdict: res.status < 400 ? 'PASS' : 'FAIL',
    issues: Array.isArray(res.body?.errors) ? res.body.errors : [],
    status: res.status,
    body: res.body,
  };
};

export { withPollution };
