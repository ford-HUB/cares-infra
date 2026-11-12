import { INestApplication, ModuleMetadata, Provider, Type } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { Agent } from 'node:http';
import request from 'supertest';
import { ZodType } from 'zod';
import { HttpExceptionFilter } from '../../src/shared/filters/http-exception-filter';
import { ResponseTransformInterceptor } from '../../src/shared/interceptors/response-transform-interceptor';
import { LEAK_SIGNATURES } from './security-payloads';

/**
 * Two layers, one verdict each:
 *
 *   Layer 1 — schema: the module's Zod request schema, `safeParse`d directly.
 *   Layer 2 — API:    the same input sent through the real controller, nest-zod
 *                     pipe, interceptor and `HttpExceptionFilter`, with the
 *                     service mocked so nothing reaches Prisma.
 *
 * A fixture's `expected` is the only source of truth. Both layers must return
 * that verdict; a test never adjusts `expected` to match what the code does.
 */
export type Verdict = 'PASS' | 'FAIL';

export interface LayerFixture<TInput = unknown> {
  name: string;
  input: TInput;
  expected: Verdict;
  /** Dotted issue path that must be reported when `expected` is FAIL, e.g. `email` or `items.0.qty`. */
  field?: string;
  /** Exact message (string) or pattern the issue for `field` must carry. */
  message?: string | RegExp;
}

export interface ValidationIssue {
  path: string;
  message: string;
  code?: string;
}

export interface LayerOutcome {
  layer: 'schema' | 'api';
  verdict: Verdict;
  issues: ValidationIssue[];
  status?: number;
  body?: any;
  data?: unknown;
}

export const runSchemaLayer = async (
  schema: ZodType,
  input: unknown,
): Promise<LayerOutcome> => {
  const result = await schema.safeParseAsync(input);

  if (result.success) {
    return { layer: 'schema', verdict: 'PASS', issues: [], data: result.data };
  }

  return {
    layer: 'schema',
    verdict: 'FAIL',
    issues: result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    })),
  };
};

export interface ApiCall {
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  /** Full path including the global prefix, e.g. `/api/v1/auth/admin/login`. */
  path: string;
  body?: unknown;
  /** Sent verbatim with `Content-Type: application/json` — use for `__proto__` bodies. */
  rawBody?: string;
  query?: Record<string, unknown>;
  headers?: Record<string, string>;
}

/** Splices a `PROTOTYPE_POLLUTION_BODIES` payload into an otherwise valid raw JSON body. */
export const withPollution = (valid: object, raw: string) =>
  `${JSON.stringify(valid).slice(0, -1)},${raw.slice(1)}`;

/**
 * Fixtures run in the thousands, and a connection per request leaves a socket in
 * TIME_WAIT for each one: enough on Windows to exhaust the ephemeral ports, which then
 * fails unrelated tests with EADDRINUSE. Reusing connections keeps the suite repeatable.
 */
const keepAliveAgent = new Agent({ keepAlive: true });

/** Any status below 400 is PASS; the error envelope is what makes it FAIL. */
export const runApiLayer = async (
  app: INestApplication,
  call: ApiCall,
): Promise<LayerOutcome> => {
  let req = request(app.getHttpServer())[call.method](call.path).agent(keepAliveAgent);

  for (const [key, value] of Object.entries(call.headers ?? {})) {
    req = req.set(key, value);
  }
  if (call.query) req = req.query(call.query as Record<string, string>);

  const res =
    call.rawBody !== undefined
      ? await req.set('Content-Type', 'application/json').send(call.rawBody)
      : call.body !== undefined
        ? await req.send(call.body as object)
        : await req;

  const issues: ValidationIssue[] = Array.isArray(res.body?.errors)
    ? res.body.errors
    : [];

  return {
    layer: 'api',
    verdict: res.status < 400 ? 'PASS' : 'FAIL',
    issues,
    status: res.status,
    body: res.body,
  };
};

/**
 * Asserts one layer against the fixture. Fails with a message naming the
 * layer and fixture so a red test says exactly which gate let the input through.
 */
export const expectLayer = (outcome: LayerOutcome, fixture: LayerFixture) => {
  const detail = `[${outcome.layer}] "${fixture.name}" expected ${fixture.expected}, got ${outcome.verdict}` +
    (outcome.issues.length ? ` — issues: ${JSON.stringify(outcome.issues)}` : '') +
    (outcome.status ? ` — status ${outcome.status}` : '');

  if (outcome.verdict !== fixture.expected) {
    throw new Error(detail);
  }

  if (fixture.expected === 'FAIL' && fixture.field !== undefined) {
    const issue = outcome.issues.find((i) => i.path === fixture.field);
    if (!issue) {
      throw new Error(`${detail} — no issue reported on "${fixture.field}"`);
    }
    if (typeof fixture.message === 'string') expect(issue.message).toBe(fixture.message);
    if (fixture.message instanceof RegExp) expect(issue.message).toMatch(fixture.message);
  }
};

/**
 * The error contract every FAIL from the API layer must honour: the envelope
 * shape from `HttpExceptionFilter`, and nothing from the database or stack.
 */
export const expectSafeErrorEnvelope = (outcome: LayerOutcome) => {
  expect(outcome.body).toEqual(
    expect.objectContaining({ ok: false, message: expect.any(String) }),
  );
  expect(outcome.body).not.toHaveProperty('data');
  expect(outcome.body).not.toHaveProperty('stack');

  const serialized = JSON.stringify(outcome.body);
  for (const signature of LEAK_SIGNATURES) {
    expect(serialized).not.toMatch(signature);
  }
};

/** `expectSafeErrorEnvelope` plus the validation-specific shape: 400 and `{ path, message }[]`. */
export const expectValidationEnvelope = (outcome: LayerOutcome) => {
  expect(outcome.status).toBe(400);
  expectSafeErrorEnvelope(outcome);
  expect(outcome.body.message).toBe('Validation failed');
  expect(outcome.body.errors).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ path: expect.any(String), message: expect.any(String) }),
    ]),
  );
};

const LIFECYCLE_KEYS = new Set<PropertyKey>([
  'then',
  'onModuleInit',
  'onApplicationBootstrap',
  'onModuleDestroy',
  'beforeApplicationShutdown',
  'onApplicationShutdown',
]);

/**
 * A provider whose every method is a `jest.fn()` created on first access.
 * Lifecycle hooks and `then` stay undefined so Nest neither calls them nor
 * treats the mock as a promise.
 */
export const autoMock = <T extends object>(overrides: Partial<Record<keyof T, any>> = {}): jest.Mocked<T> => {
  const fns = new Map<PropertyKey, jest.Mock>(
    Object.entries(overrides).map(([k, v]) => [k, v as jest.Mock]),
  );

  return new Proxy({} as jest.Mocked<T>, {
    get(_target, key) {
      if (LIFECYCLE_KEYS.has(key) || typeof key === 'symbol') return undefined;
      if (!fns.has(key)) fns.set(key, jest.fn());
      return fns.get(key);
    },
  });
};

export const mockProvider = <T extends object>(token: Type<T> | string | symbol, overrides?: Partial<Record<keyof T, any>>): Provider => ({
  provide: token,
  useValue: autoMock<T>(overrides),
});

/**
 * Boots only the controller(s) under test with the same global prefix,
 * interceptor and filter as `main.ts`. Global guards from `app-module.ts`
 * are deliberately absent — auth is out of scope for validation layers.
 */
export const createApiLayerApp = async (
  metadata: Pick<ModuleMetadata, 'controllers' | 'providers' | 'imports'>,
): Promise<INestApplication> => {
  const moduleRef = await Test.createTestingModule(metadata).compile();
  const app = moduleRef.createNestApplication({ logger: false });

  app.setGlobalPrefix('api');
  app.useGlobalInterceptors(new ResponseTransformInterceptor(app.get(Reflector)));
  app.useGlobalFilters(new HttpExceptionFilter());

  // Already listening, so supertest does not start and stop a server per request.
  await app.listen(0, '127.0.0.1');
  return app;
};
