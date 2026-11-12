import { asCase } from '../../../../config/test-case';
import { SCHEDULER_DEFINITIONS } from '../../../../../src/schedulers/scheduler-registry';
import { LayerFixture, runApiLayer } from '../../../../config/layer-harness';
import {
  ENDPOINTS,
  ROSTER_RESPONSE,
  VALID_SERVICE_ID,
  describeServiceIdTable,
  useSystemServicesApp,
} from '../system-services-site-support';

/**
 * System Module · Services — valid inputs.
 *
 * Every case here is a legitimate input the system must accept.
 * The invalid cases for this unit live in ../invalid/.
 */

/* ── input validation ────────────────────────────────────────────────────── */
{
  /**
   * Run service / Stop run — input validation: every id in the scheduler catalogue must
   * pass, and the id format is lower-case words separated by single hyphens.
   */
  const fixtures: LayerFixture<string>[] = [
    ...SCHEDULER_DEFINITIONS.map((definition): LayerFixture<string> => ({
      name: `catalogue id ${definition.id}`,
      input: definition.id,
      expected: 'PASS',
    })),
    // Well-formed but unknown: the format check passes it and the service answers 404.
    { name: 'well-formed unknown id', input: 'no-such-service', expected: 'PASS' },
  ];

  describe('system services site · run and stop — input validation', () => {
    const ctx = useSystemServicesApp();

    describe.each(ENDPOINTS)('$title', (endpoint) => {
      describeServiceIdTable(ctx, endpoint, fixtures);

      asCase('valid', 'Staff triggers the action with no body').it('needs no body and returns the refreshed roster', async () => {
        const outcome = await runApiLayer(ctx.app, { method: 'post', path: endpoint.path() });
        expect(outcome.status).toBe(201);
        expect(outcome.body).toEqual({ ok: true, message: endpoint.message, data: ROSTER_RESPONSE });
      });
    });
  });
}

/* ── normalization ───────────────────────────────────────────────────────── */
{
  /**
   * Run service / Stop run — normalisation: the service receives the id from the path
   * unchanged, and nothing else.
   */
  describe('system services site · run and stop — normalisation', () => {
    const ctx = useSystemServicesApp();

    describe.each(ENDPOINTS)('$title', (endpoint) => {
      asCase('valid', 'Staff submits a valid request').it('passes only the id from the path to the service', async () => {
        await runApiLayer(ctx.app, { method: 'post', path: endpoint.path() });
        expect(ctx.service[endpoint.method]).toHaveBeenCalledTimes(1);
        expect(ctx.service[endpoint.method].mock.calls[0]).toEqual([VALID_SERVICE_ID]);
      });
    });
  });
}
