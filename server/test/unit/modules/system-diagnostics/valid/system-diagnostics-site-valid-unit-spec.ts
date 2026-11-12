import { asCase } from '../../../../config/test-case';
import { runApiLayer, autoMock } from '../../../../config/layer-harness';
import { CHECK_PATH, DIAGNOSTICS_RESPONSE, useSystemDiagnosticsApp } from '../system-diagnostics-site-support';
import { SystemDiagnosticsSiteService } from '../../../../../src/modules/system-diagnostics/services/system-diagnostics-site-service';

/**
 * System Module · Diagnostics — valid inputs.
 *
 * Every case here is a legitimate input the system must accept.
 * The invalid cases for this unit live in ../invalid/.
 */

/* ── error handling ──────────────────────────────────────────────────────── */
{
  /**
   * Run checks — error handling: a failing sweep or a report that breaks the response
   * schema comes back as a generic 500 with nothing leaked. A failing probe is not an
   * error: it is a 200 whose report says so.
   */
  describe('system diagnostics site · run checks — error handling', () => {
    const ctx = useSystemDiagnosticsApp();

    describe(`POST ${CHECK_PATH}`, () => {
      const check = () => runApiLayer(ctx.app, { method: 'post', path: CHECK_PATH });

      asCase('valid', 'Staff runs checks while some services are down').it('answers a report of failing probes with a 200', async () => {
        const failing = {
          ...DIAGNOSTICS_RESPONSE,
          report: {
            ...DIAGNOSTICS_RESPONSE.report,
            overall: 'down',
            checks: [{ ...DIAGNOSTICS_RESPONSE.report.checks[0], status: 'fail', detail: 'No answer within 5s' }],
          },
        };
        ctx.service.runDiagnostics.mockResolvedValueOnce(failing as never);
        const outcome = await check();
        expect(outcome.status).toBe(200);
        expect(outcome.body.data).toEqual(failing);
      });
    });
  });
}

/* ── input validation ────────────────────────────────────────────────────── */
{
  /**
   * Run checks — input validation: the endpoint takes no input, so a bare POST must
   * work, and the only valid answers are the report shapes the portal reads.
   */
  describe('system diagnostics site · run checks — input validation', () => {
    const ctx = useSystemDiagnosticsApp();

    describe(`POST ${CHECK_PATH}`, () => {
      asCase('valid', 'Staff triggers the action with no body').it('needs no body and answers 200 with the fresh report', async () => {
        const outcome = await runApiLayer(ctx.app, { method: 'post', path: CHECK_PATH });
        expect(outcome.status).toBe(200);
        expect(outcome.body).toEqual({ ok: true, message: 'Diagnostics complete', data: DIAGNOSTICS_RESPONSE });
        expect(ctx.service.runDiagnostics).toHaveBeenCalledTimes(1);
      });

      asCase('valid', 'Staff runs checks with an empty JSON body').it('accepts an empty JSON body', async () => {
        const outcome = await runApiLayer(ctx.app, { method: 'post', path: CHECK_PATH, body: {} });
        expect(outcome.status).toBe(200);
        expect(ctx.service.runDiagnostics).toHaveBeenCalledTimes(1);
      });

      asCase('valid', 'Staff runs checks and a probe reports no timing').it('allows a report whose probes have no timing', async () => {
        const data = {
          ...DIAGNOSTICS_RESPONSE,
          report: {
            ...DIAGNOSTICS_RESPONSE.report,
            overall: 'down',
            checks: [{ ...DIAGNOSTICS_RESPONSE.report.checks[0], status: 'fail', latency_ms: null, detail: 'No answer within 5s' }],
          },
        };
        ctx.service.runDiagnostics.mockResolvedValueOnce(data as never);
        const outcome = await runApiLayer(ctx.app, { method: 'post', path: CHECK_PATH });
        expect(outcome.status).toBe(200);
        expect(outcome.body.data).toEqual(data);
      });
    });
  });
}

/* ── normalization ───────────────────────────────────────────────────────── */
{
  /**
   * Run checks — normalisation: the real service records a staff-pressed run as `manual`
   * and maps the checker's report to the wire shape, with history oldest first. Only the
   * checker is mocked, because its probes need live infrastructure.
   */
  const CHECKER_REPORT = {
    checkedAt: '2026-11-03T08:00:00.000Z',
    durationMs: 42,
    overall: 'degraded',
    source: 'manual',
    checks: [
      { id: 'redis', group: 'cache', name: 'Redis', status: 'warn', latencyMs: 900, detail: 'Answered, but slowly' },
      { id: 'heap', group: 'process', name: 'Heap', status: 'ok', latencyMs: null, detail: 'Heap 90 MB' },
    ],
  };
  const CHECKER_HISTORY_NEWEST_FIRST = [
    { checkedAt: '2026-11-03T07:59:00.000Z', overall: 'degraded', failing: 1 },
    { checkedAt: '2026-11-03T07:58:00.000Z', overall: 'healthy', failing: 0 },
  ];

  describe('system diagnostics site · run checks — normalisation', () => {
    const run = async () => {
      const checker = autoMock<{ run: jest.Mock; history: jest.Mock }>();
      checker.run.mockResolvedValue(CHECKER_REPORT);
      checker.history.mockResolvedValue(CHECKER_HISTORY_NEWEST_FIRST);
      const service = new (SystemDiagnosticsSiteService as any)(checker) as SystemDiagnosticsSiteService;
      return { checker, result: await service.runDiagnostics() };
    };

    describe('runDiagnostics (real service)', () => {
      asCase('valid', 'Staff runs checks').it('runs the probes once, marked as a manual run', async () => {
        const { checker } = await run();
        expect(checker.run).toHaveBeenCalledTimes(1);
        expect(checker.run).toHaveBeenCalledWith('manual');
      });

      asCase('valid', 'Staff runs checks').it('maps the report to snake_case, keeping a null latency', async () => {
        const { result } = await run();
        expect(result.report).toEqual({
          checked_at: CHECKER_REPORT.checkedAt,
          duration_ms: CHECKER_REPORT.durationMs,
          overall: 'degraded',
          source: 'manual',
          checks: [
            { id: 'redis', group: 'cache', name: 'Redis', status: 'warn', latency_ms: 900, detail: 'Answered, but slowly' },
            { id: 'heap', group: 'process', name: 'Heap', status: 'ok', latency_ms: null, detail: 'Heap 90 MB' },
          ],
        });
      });

      asCase('valid', 'Staff runs checks').it('returns history oldest first, without changing the stored order', async () => {
        const stored = [...CHECKER_HISTORY_NEWEST_FIRST];
        const { result } = await run();
        expect(result.history).toEqual([
          { checked_at: stored[1].checkedAt, overall: 'healthy', failing: 0 },
          { checked_at: stored[0].checkedAt, overall: 'degraded', failing: 1 },
        ]);
        expect(CHECKER_HISTORY_NEWEST_FIRST).toEqual(stored);
      });
    });
  });
}

/* ── security ────────────────────────────────────────────────────────────── */
{
  /**
   * Run checks — security: nothing the caller sends may reach the probes, and only the
   * fields in `SystemDiagnosticsSchema` may leave the server.
   */
  describe('system diagnostics site · run checks — security', () => {
    const ctx = useSystemDiagnosticsApp();

    describe(`POST ${CHECK_PATH}`, () => {

      asCase('valid', 'The service returns internal fields along with the result').it('drops anything from the service that is not in the response schema', async () => {
        const report = DIAGNOSTICS_RESPONSE.report;
        ctx.service.runDiagnostics.mockResolvedValueOnce({
          ...DIAGNOSTICS_RESPONSE,
          database_url: 'postgresql://cares:secret@db:5432/cares',
          report: {
            ...report,
            redis_password: 'secret',
            checks: [{ ...report.checks[0], stack: 'Error: boom\n    at probe (scheduler-diagnostics.ts:1:1)' }],
          },
        } as never);

        const outcome = await runApiLayer(ctx.app, { method: 'post', path: CHECK_PATH });

        expect(outcome.status).toBe(200);
        expect(outcome.body.data).toEqual(DIAGNOSTICS_RESPONSE);
        expect(JSON.stringify(outcome.body)).not.toContain('secret');
      });
    });
  });
}
