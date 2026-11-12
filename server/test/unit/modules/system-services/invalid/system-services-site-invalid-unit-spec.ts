import { asCase } from '../../../../config/test-case';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import {
  expectSafeErrorEnvelope,
  runApiLayer,
  LayerFixture,
  autoMock,
} from '../../../../config/layer-harness';
import {
  ENDPOINTS,
  RUN_ENDPOINT,
  STOP_ENDPOINT,
  useSystemServicesApp,
  VALID_SERVICE_ID,
  describeServiceIdTable,
} from '../system-services-site-support';
import { SystemServicesSiteService } from '../../../../../src/modules/system-services/services/system-services-site-service';
import { HOSTILE_STRINGS, PROTOTYPE_POLLUTION_BODIES } from '../../../../config/security-payloads';

/**
 * System Module · Services — invalid inputs.
 *
 * Every case here is an intentionally wrong input. A case Passes when the system
 * refuses it exactly as stated — a rejection as expected is the correct result.
 * The valid cases for this unit live in ../valid/.
 */

/* ── error handling ──────────────────────────────────────────────────────── */
{
  /**
   * Run service / Stop run — error handling: unexpected service errors are masked as a
   * generic 500 with nothing leaked, and the service's deliberate HttpExceptions keep
   * their status and message through the envelope.
   */
  const DELIBERATE_ERRORS = [
    { title: 'run · 404 for an unknown service', endpoint: RUN_ENDPOINT, error: new NotFoundException('Service not found') },
    { title: 'run · 409 when a run is already in progress', endpoint: RUN_ENDPOINT, error: new ConflictException('A run is already in progress') },
    { title: 'stop · 404 for an unknown service', endpoint: STOP_ENDPOINT, error: new NotFoundException('Service not found') },
    {
      title: 'stop · 400 when only a run in flight remains',
      endpoint: STOP_ENDPOINT,
      error: new BadRequestException('The run in flight cannot be interrupted — it will stop at its runtime cap'),
    },
  ];

  describe('system services site · run and stop — error handling', () => {
    const ctx = useSystemServicesApp();

    describe.each(ENDPOINTS)('$title', (endpoint) => {
      asCase('invalid', 'The service fails with an unexpected internal or database error').it('masks an unexpected service error as a 500 without leaking detail', async () => {
        ctx.service[endpoint.method].mockRejectedValueOnce(new Error('connect ECONNREFUSED redis:6379') as never);
        const outcome = await runApiLayer(ctx.app, { method: 'post', path: endpoint.path() });
        expect(outcome.status).toBe(500);
        expectSafeErrorEnvelope(outcome);
        expect(outcome.body).toEqual({ ok: false, message: 'Internal server error' });
      });
    });

    asCase('invalid', 'The service refuses the request with a deliberate HTTP error (each kind)', 'Each deliberate error keeps its status and message in the { ok: false } envelope').it.each(DELIBERATE_ERRORS)('keeps $title', async ({ endpoint, error }) => {
      ctx.service[endpoint.method].mockRejectedValueOnce(error as never);
      const outcome = await runApiLayer(ctx.app, { method: 'post', path: endpoint.path() });
      expect(outcome.status).toBe(error.getStatus());
      expectSafeErrorEnvelope(outcome);
      expect(outcome.body.message).toBe(error.message);
    });
  });
}

/* ── input validation ────────────────────────────────────────────────────── */
{
  /**
   * Run service / Stop run — input validation: every id in the scheduler catalogue must
   * pass, and the id format is lower-case words separated by single hyphens.
   */
  const fixtures: LayerFixture<string>[] = [

    { name: 'upper-case letters', input: 'Unread-Digest', expected: 'FAIL' },
    { name: 'underscore', input: 'unread_digest', expected: 'FAIL' },
    { name: 'inner space', input: 'unread digest', expected: 'FAIL' },
    { name: 'surrounding spaces', input: ` ${VALID_SERVICE_ID} `, expected: 'FAIL' },
    { name: 'encoded slash', input: `${VALID_SERVICE_ID}/logs`, expected: 'FAIL' },
    { name: 'leading hyphen', input: `-${VALID_SERVICE_ID}`, expected: 'FAIL' },
    { name: 'trailing hyphen', input: `${VALID_SERVICE_ID}-`, expected: 'FAIL' },
    { name: 'doubled hyphen', input: 'unread--digest', expected: 'FAIL' },
    { name: 'far longer than any catalogue id', input: 'a'.repeat(1000), expected: 'FAIL' },
  ];

  describe('system services site · run and stop — input validation', () => {
    const ctx = useSystemServicesApp();

    describe.each(ENDPOINTS)('$title', (endpoint) => {
      describeServiceIdTable(ctx, endpoint, fixtures);
    });
  });
}

/* ── security ────────────────────────────────────────────────────────────── */
{
  /**
   * Run service / Stop run — security: the id is a catalogue slug, so every hostile
   * string FAILs. Neither handler reads a body, so nothing in one can steer the run.
   */
  const fixtures: LayerFixture<string>[] = [
    ...HOSTILE_STRINGS.map((p): LayerFixture<string> => ({
      name: `id ← ${p.category}: ${p.label}`,
      input: p.value as string,
      expected: 'FAIL',
    })),
    { name: 'id ← valid id with SQL tail', input: `${VALID_SERVICE_ID}' OR '1'='1`, expected: 'FAIL' },
    { name: 'id ← valid id with stacked query', input: `${VALID_SERVICE_ID}; DROP TABLE "User"`, expected: 'FAIL' },
  ];

  /** Fit the id format but name no catalogue entry, including an inherited object key. */
  const UNKNOWN_WELL_FORMED_IDS = ['no-such-service', '---', '0x27204f5220313d31', 'constructor'];

  describe('system services site · run and stop — security', () => {
    const ctx = useSystemServicesApp();

    describe.each(ENDPOINTS)('$title', (endpoint) => {
      describeServiceIdTable(ctx, endpoint, fixtures);

      asCase('invalid', 'Client sends body fields the endpoint does not accept').it('ignores anything a body tries to set', async () => {
        await runApiLayer(ctx.app, {
          method: 'post',
          path: endpoint.path(),
          body: { id: 'purge-finished-jobs', attempts: 100, queue: 'cleanup' },
        });
        expect(ctx.service[endpoint.method]).toHaveBeenCalledTimes(1);
        expect(ctx.service[endpoint.method]).toHaveBeenCalledWith(VALID_SERVICE_ID);
      });

      asCase('invalid', 'Attacker sends a __proto__ / constructor.prototype body', 'The body changes nothing; Object.prototype is not polluted').it.each(PROTOTYPE_POLLUTION_BODIES)('a pollution body changes nothing: $label', async (p) => {
        await runApiLayer(ctx.app, { method: 'post', path: endpoint.path(), rawBody: p.value as string });
        expect(ctx.service[endpoint.method]).toHaveBeenCalledWith(VALID_SERVICE_ID);
        expect(({} as any).isAdmin).toBeUndefined();
      });

      asCase('invalid', 'Client sends malformed (truncated) JSON').it('answers a malformed JSON body in the safe envelope', async () => {
        const outcome = await runApiLayer(ctx.app, { method: 'post', path: endpoint.path(), rawBody: '{"id":' });
        expect(outcome.status).toBe(400);
        expectSafeErrorEnvelope(outcome);
        expect(ctx.service[endpoint.method]).not.toHaveBeenCalled();
      });
    });

    // Only catalogue ids may touch a queue: the real service has to stop anything else
    // before it reaches the recorder or BullMQ.
    describe.each([
      { title: 'triggerRun (real service)', method: 'triggerRun' },
      { title: 'stopRun (real service)', method: 'stopRun' },
    ] as const)('$title', ({ method }) => {
      asCase('invalid', 'Staff targets a well-formed but unknown service id', 'Answers 404 without touching a queue').it.each(UNKNOWN_WELL_FORMED_IDS)('answers 404 for %s without touching a queue', async (id) => {
        const recorder = autoMock<{ active: () => unknown; effective: () => unknown }>();
        const queue = autoMock<{ add: () => unknown; getJobs: () => unknown }>();
        const service = new (SystemServicesSiteService as any)(
          recorder,
          ...Array.from({ length: 7 }, () => queue),
        ) as SystemServicesSiteService;

        await expect(service[method](id)).rejects.toThrow(NotFoundException);

        expect(recorder.active).not.toHaveBeenCalled();
        expect(queue.add).not.toHaveBeenCalled();
        expect(queue.getJobs).not.toHaveBeenCalled();
      });
    });
  });
}
