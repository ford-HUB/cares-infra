import { asCase } from '../../../../config/test-case';
import { expectSafeErrorEnvelope, runApiLayer } from '../../../../config/layer-harness';
import { CHECK_PATH, DIAGNOSTICS_RESPONSE, useSystemDiagnosticsApp } from '../system-diagnostics-site-support';

/**
 * System Module · Diagnostics — invalid inputs (field validation).
 *
 * Neither diagnostics endpoint takes a request field: GET /api/v1/system-diagnostics
 * reads the stored board and POST /api/v1/system-diagnostics/check runs the probes,
 * and neither reads a body, query or path param. The field validation this module
 * does is on the way out: `@ZSerialize(SystemDiagnosticsSchema)` checks every field of
 * the report before it reaches the portal. So the invalid cases here are:
 *
 *   - response fields — the service hands back a report with one field wrong; the
 *     client must get a generic "Internal server error" (500) and never the bad
 *     report. Each case is checked on both endpoints.
 *   - request shape — what the client sends anyway: a malformed body is refused,
 *     unused body and query fields are ignored.
 *
 * Each broken report keeps every other field valid, so the named field is the only
 * reason it can fail. The valid cases for this unit live in ../valid/.
 */

const BOARD_PATH = '/api/v1/system-diagnostics';
const REPORT = DIAGNOSTICS_RESPONSE.report;
const CHECK = REPORT.checks[0];
const HISTORY = DIAGNOSTICS_RESPONSE.history[0];

type Patch = Record<string, unknown>;

/** The stored response with keys of the top level replaced (or removed, with `undefined`). */
const withTop = (patch: Patch) => strip({ ...DIAGNOSTICS_RESPONSE, ...patch });
/** The stored response with keys of `report` replaced or removed. */
const withReport = (patch: Patch) => ({ ...DIAGNOSTICS_RESPONSE, report: strip({ ...REPORT, ...patch }) });
/** The stored response with keys of the first probe in `report.checks` replaced or removed. */
const withCheck = (patch: Patch) => ({ ...DIAGNOSTICS_RESPONSE, report: { ...REPORT, checks: [strip({ ...CHECK, ...patch })] } });
/** The stored response with keys of the first `history` entry replaced or removed. */
const withHistory = (patch: Patch) => ({ ...DIAGNOSTICS_RESPONSE, history: [strip({ ...HISTORY, ...patch })] });

/** Drops keys set to `undefined`, so "missing" really means the key is absent. */
function strip<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
}

/** Both endpoints serialize through the same schema; each case is one check per endpoint. */
const ROUTES = [
  { route: 'GET (diagnostics board)', method: 'get' as const, path: BOARD_PATH, handler: 'getDiagnostics' as const },
  { route: 'POST (run checks)', method: 'post' as const, path: CHECK_PATH, handler: 'runDiagnostics' as const },
];

const EXPECTED = 'Request fails with "Internal server error" (500); the bad report is not sent to the client';

describe('system diagnostics site — field validation', () => {
  const ctx = useSystemDiagnosticsApp();

  let consoleError: jest.SpyInstance;
  beforeEach(() => {
    ctx.service.getDiagnostics.mockReset().mockResolvedValue(DIAGNOSTICS_RESPONSE as never);
    // A serialization failure is logged by HttpExceptionFilter; keep the case table readable.
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => consoleError.mockRestore());

  /** One case: the service returns `response`; both endpoints must answer a masked 500. */
  const rejectsReport = (description: string, response: unknown) =>
    asCase('invalid', description, EXPECTED).it.each(ROUTES)('refuses it on $route', async ({ method, path, handler }) => {
      ctx.service[handler].mockResolvedValue(response as never);
      const outcome = await runApiLayer(ctx.app, { method, path });
      expect(outcome.status).toBe(500);
      expectSafeErrorEnvelope(outcome);
      expect(outcome.body).toEqual({ ok: false, message: 'Internal server error' });
      expect(ctx.service[handler]).toHaveBeenCalledTimes(1);
    });

  /* ── response: top level ─────────────────────────────────────────────── */
  describe('response', () => {
    rejectsReport('The service leaves the report out entirely (null is required before the first sweep)', withTop({ report: undefined }));
    rejectsReport('The service sends the report as text', withTop({ report: 'healthy' }));
    rejectsReport('The service leaves the history out', withTop({ history: undefined }));
    rejectsReport('The service sends the history as null instead of a list', withTop({ history: null }));
  });

  /* ── response: report ────────────────────────────────────────────────── */
  describe('report', () => {
    rejectsReport('The service leaves out when the checks ran (checked_at)', withReport({ checked_at: undefined }));
    rejectsReport('The service sends checked_at in a readable form (3 Nov 2026 08:00)', withReport({ checked_at: '3 Nov 2026 08:00' }));
    rejectsReport('The service sends checked_at with a local offset (+08:00)', withReport({ checked_at: '2026-11-03T16:00:00+08:00' }));
    rejectsReport('The service sends checked_at on a day that does not exist (31 November)', withReport({ checked_at: '2026-11-31T08:00:00.000Z' }));
    rejectsReport('The service leaves the run duration out (duration_ms)', withReport({ duration_ms: undefined }));
    rejectsReport('The service sends the run duration as text ("42")', withReport({ duration_ms: '42' }));
    rejectsReport('The service sends the run duration as null', withReport({ duration_ms: null }));
    rejectsReport('The service leaves the overall status out', withReport({ overall: undefined }));
    rejectsReport('The service sends an overall status that does not exist (on fire)', withReport({ overall: 'on fire' }));
    rejectsReport('The service sends the overall status in upper case (HEALTHY)', withReport({ overall: 'HEALTHY' }));
    rejectsReport('The service sends a probe status as the overall status (ok)', withReport({ overall: 'ok' }));
    rejectsReport('The service leaves out who started the run (source)', withReport({ source: undefined }));
    rejectsReport('The service sends a run source that does not exist (cron)', withReport({ source: 'cron' }));
    rejectsReport('The service leaves the list of checks out', withReport({ checks: undefined }));
    rejectsReport('The service sends the checks as one object instead of a list', withReport({ checks: CHECK }));
  });

  /* ── response: report.checks[] ───────────────────────────────────────── */
  describe('checks', () => {
    rejectsReport('The service leaves a probe id out', withCheck({ id: undefined }));
    rejectsReport('The service sends a probe id as a number', withCheck({ id: 1 }));
    rejectsReport('The service leaves a probe group out', withCheck({ group: undefined }));
    rejectsReport('The service sends a probe group that does not exist (storage)', withCheck({ group: 'storage' }));
    rejectsReport('The service sends a probe group in upper case (DATABASE)', withCheck({ group: 'DATABASE' }));
    rejectsReport('The service sends a probe name as null', withCheck({ name: null }));
    rejectsReport('The service leaves a probe status out', withCheck({ status: undefined }));
    rejectsReport('The service sends a probe status that does not exist (error)', withCheck({ status: 'error' }));
    rejectsReport('The service sends a probe status in upper case (OK)', withCheck({ status: 'OK' }));
    rejectsReport('The service sends an overall status as a probe status (healthy)', withCheck({ status: 'healthy' }));
    rejectsReport('The service leaves a probe latency out (null is required when there is no timing)', withCheck({ latency_ms: undefined }));
    rejectsReport('The service sends a probe latency as text with a unit ("3ms")', withCheck({ latency_ms: '3ms' }));
    rejectsReport('The service sends a probe latency under its internal name (latencyMs)', withCheck({ latency_ms: undefined, latencyMs: 3 }));
    rejectsReport('The service leaves a probe detail out', withCheck({ detail: undefined }));
    rejectsReport('The service sends a probe detail as null', withCheck({ detail: null }));
  });

  /* ── response: history[] ─────────────────────────────────────────────── */
  describe('history', () => {
    rejectsReport('The service leaves out when a past run happened (checked_at)', withHistory({ checked_at: undefined }));
    rejectsReport('The service sends a past run time that is not an ISO date-time', withHistory({ checked_at: '2026-11-03 07:59' }));
    rejectsReport('The service sends a past overall status that does not exist (unknown)', withHistory({ overall: 'unknown' }));
    rejectsReport('The service leaves the failing count of a past run out', withHistory({ failing: undefined }));
    rejectsReport('The service sends the failing count as text ("0")', withHistory({ failing: '0' }));
    rejectsReport('The service sends the failing count as null', withHistory({ failing: null }));
  });

  /* ── request shape ───────────────────────────────────────────────────── */
  describe('request', () => {
    /** The handler takes nothing, so the probes must run with no arguments at all. */
    const expectUntouchedRun = () => {
      expect(ctx.service.runDiagnostics).toHaveBeenCalledTimes(1);
      expect(ctx.service.runDiagnostics.mock.calls[0]).toEqual([]);
    };

    asCase('invalid', 'Client sends a malformed (truncated) JSON body to Run checks', 'Request fails with 400 in the { ok: false } envelope; the probes do not run').it(
      'refuses a malformed body without running the probes',
      async () => {
        const outcome = await runApiLayer(ctx.app, { method: 'post', path: CHECK_PATH, rawBody: '{"source":' });
        expect(outcome.status).toBe(400);
        expectSafeErrorEnvelope(outcome);
        expect(ctx.service.runDiagnostics).not.toHaveBeenCalled();
      },
    );

    asCase('invalid', 'Client asks Run checks for a scheduled run, specific probes and a timeout', 'Diagnostics complete (200); the body is ignored and every probe runs as a manual run').it(
      'ignores body fields the endpoint does not take',
      async () => {
        const outcome = await runApiLayer(ctx.app, {
          method: 'post',
          path: CHECK_PATH,
          body: { source: 'scheduled', checks: ['database'], timeout_ms: 1 },
        });
        expect(outcome.status).toBe(200);
        expectUntouchedRun();
      },
    );

    asCase('invalid', 'Client adds query parameters to Run checks (source, group)', 'Diagnostics complete (200); the query is ignored').it(
      'ignores query parameters the endpoint does not take',
      async () => {
        const outcome = await runApiLayer(ctx.app, { method: 'post', path: CHECK_PATH, query: { source: 'scheduled', group: 'database' } });
        expect(outcome.status).toBe(200);
        expectUntouchedRun();
      },
    );

    asCase('invalid', 'Client sends a body with the diagnostics board request (GET)', 'System diagnostics (200); the body is ignored and the stored board is returned').it(
      'ignores a body on the board read',
      async () => {
        const outcome = await runApiLayer(ctx.app, { method: 'get', path: BOARD_PATH, body: { report: null } });
        expect(outcome.status).toBe(200);
        expect(ctx.service.getDiagnostics).toHaveBeenCalledTimes(1);
        expect(ctx.service.getDiagnostics.mock.calls[0]).toEqual([]);
        expect(outcome.body.data).toEqual(DIAGNOSTICS_RESPONSE);
      },
    );
  });
});
