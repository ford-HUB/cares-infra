import { asCase } from '../../../../config/test-case';
import { BadGatewayException, InternalServerErrorException, ServiceUnavailableException } from '@nestjs/common';
import { expectSafeErrorEnvelope, runApiLayer } from '../../../../config/layer-harness';
import { CHECK_PATH, DIAGNOSTICS_RESPONSE, useSystemDiagnosticsApp } from '../system-diagnostics-site-support';
import { HOSTILE_STRINGS, MASS_ASSIGNMENT_KEYS, PROTOTYPE_POLLUTION_BODIES } from '../../../../config/security-payloads';

/**
 * System Module · Diagnostics — invalid inputs.
 *
 * Every case here is an intentionally wrong input. A case Passes when the system
 * refuses it exactly as stated — a rejection as expected is the correct result.
 * The valid cases for this unit live in ../valid/.
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

      asCase('invalid', 'The service fails with an unexpected internal or database error').it('masks an unexpected service error as a 500 without leaking detail', async () => {
        ctx.service.runDiagnostics.mockRejectedValueOnce(new Error('connect ECONNREFUSED redis:6379'));
        const outcome = await check();
        expect(outcome.status).toBe(500);
        expectSafeErrorEnvelope(outcome);
        expect(outcome.body).toEqual({ ok: false, message: 'Internal server error' });
      });

      asCase('invalid', 'The service returns data that breaks the response schema').it('masks a report that breaks the response schema as a 500', async () => {
        ctx.service.runDiagnostics.mockResolvedValueOnce({
          ...DIAGNOSTICS_RESPONSE,
          report: { ...DIAGNOSTICS_RESPONSE.report, overall: 'on fire' },
        } as never);
        const outcome = await check();
        expect(outcome.status).toBe(500);
        expectSafeErrorEnvelope(outcome);
        expect(outcome.body).toEqual({ ok: false, message: 'Internal server error' });
      });

      asCase('invalid', 'The service returns data that breaks the response schema').it('keeps the schema failure in the server log', async () => {
        const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        ctx.service.runDiagnostics.mockResolvedValueOnce({
          ...DIAGNOSTICS_RESPONSE,
          report: { ...DIAGNOSTICS_RESPONSE.report, overall: 'on fire' },
        } as never);
        await check();
        expect(log).toHaveBeenCalledWith(
          '[HttpExceptionFilter]',
          'Serialization failed',
          expect.any(String),
          expect.objectContaining({ path: 'report.overall' }),
        );
        log.mockRestore();
      });

      asCase('invalid', 'The service throws a 500 HttpException carrying internal detail').it('masks a thrown 500 HttpException', async () => {
        ctx.service.runDiagnostics.mockRejectedValueOnce(new InternalServerErrorException('redis:6379 refused'));
        const outcome = await check();
        expect(outcome.status).toBe(500);
        expect(outcome.body).toEqual({ ok: false, message: 'Internal server error' });
      });

      asCase('invalid', 'A probe dependency is unavailable (502 / 503)', 'The deliberate status and message are kept in the { ok: false } envelope').it.each([
        { title: '502', error: new BadGatewayException('OCR service is unavailable. Please try again shortly.') },
        { title: '503', error: new ServiceUnavailableException('Online payments are not configured yet') },
      ])('keeps the message of a deliberate $title', async ({ error }) => {
        ctx.service.runDiagnostics.mockRejectedValueOnce(error);
        const outcome = await check();
        expect(outcome.status).toBe(error.getStatus());
        expect(outcome.body).toEqual({ ok: false, message: error.message });
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
      /** The handler takes nothing, so the service must be called with no arguments at all. */
      const expectUntouchedRun = () => {
        expect(ctx.service.runDiagnostics).toHaveBeenCalledTimes(1);
        expect(ctx.service.runDiagnostics.mock.calls[0]).toEqual([]);
      };

      asCase('invalid', 'Client sends body fields the endpoint does not accept').it('ignores a body naming a source or a probe', async () => {
        const outcome = await runApiLayer(ctx.app, {
          method: 'post',
          path: CHECK_PATH,
          body: { source: 'scheduled', checks: ['database'], timeout_ms: 1 },
        });
        expect(outcome.status).toBe(200);
        expectUntouchedRun();
      });

      asCase('invalid', 'Client sends extra fields in the body', 'Extra body keys are ignored').it.each(MASS_ASSIGNMENT_KEYS)('ignores extra body keys: %j', async (extra) => {
        const outcome = await runApiLayer(ctx.app, { method: 'post', path: CHECK_PATH, body: extra });
        expect(outcome.status).toBe(200);
        expectUntouchedRun();
      });

      asCase('invalid', 'Attacker puts hostile strings in the query string', 'The query is ignored; the checks run normally').it.each(HOSTILE_STRINGS)('ignores a hostile query value · $category: $label', async (p) => {
        const outcome = await runApiLayer(ctx.app, { method: 'post', path: CHECK_PATH, query: { source: p.value } });
        expect(outcome.status).toBe(200);
        expectUntouchedRun();
      });

      asCase('invalid', 'Attacker sends a __proto__ / constructor.prototype body', 'The body changes nothing; Object.prototype is not polluted').it.each(PROTOTYPE_POLLUTION_BODIES)('a pollution body changes nothing: $label', async (p) => {
        const outcome = await runApiLayer(ctx.app, { method: 'post', path: CHECK_PATH, rawBody: p.value as string });
        expect(outcome.status).toBe(200);
        expectUntouchedRun();
        expect(({} as any).isAdmin).toBeUndefined();
      });

      asCase('invalid', 'Client sends malformed (truncated) JSON').it('answers a malformed JSON body in the safe envelope, without running the probes', async () => {
        const outcome = await runApiLayer(ctx.app, { method: 'post', path: CHECK_PATH, rawBody: '{"source":' });
        expect(outcome.status).toBe(400);
        expectSafeErrorEnvelope(outcome);
        expect(ctx.service.runDiagnostics).not.toHaveBeenCalled();
      });
    });
  });
}
