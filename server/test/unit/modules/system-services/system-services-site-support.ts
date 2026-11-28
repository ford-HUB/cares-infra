import { INestApplication } from '@nestjs/common';
import { SystemServicesSiteController } from '../../../../src/modules/system-services/controllers/system-services-site-controller';
import { SystemServicesSiteService } from '../../../../src/modules/system-services/services/system-services-site-service';
import {
  LayerFixture,
  autoMock,
  createApiLayerApp,
  expectLayer,
  expectValidationEnvelope,
  runApiLayer,
} from '../../../config/layer-harness';
import { fixtureCases, setCaseUnit } from '../../../config/test-case';

setCaseUnit({ module: 'System Module', unit: 'Services', prefix: 'SVC' });

/** The id is the only input; its schema is private to the controller, so id cases are API-layer only. */
export const VALID_SERVICE_ID = 'unread-digest';

const servicePath = (id: string, action: string) =>
  `/api/v1/system-services/${encodeURIComponent(id)}/${action}`;

export const RUN_ENDPOINT = {
  title: 'POST /api/v1/system-services/:id/run',
  path: (id: string = VALID_SERVICE_ID) => servicePath(id, 'run'),
  method: 'triggerRun',
  message: 'Run started',
} as const;
export const STOP_ENDPOINT = {
  title: 'POST /api/v1/system-services/:id/stop',
  path: (id: string = VALID_SERVICE_ID) => servicePath(id, 'stop'),
  method: 'stopRun',
  message: 'Run stopped',
} as const;
export const ENDPOINTS = [RUN_ENDPOINT, STOP_ENDPOINT];

export const ROSTER_RESPONSE = [
  {
    id: VALID_SERVICE_ID,
    name: 'Unread notification digest',
    description: 'Mails a digest of unread notifications.',
    owner: 'server',
    state: 'scheduled',
    trigger: { mode: 'interval', interval_minutes: 15, daily_at: '08:00', cron_expression: '' },
    duration: { max_runtime_minutes: 5, retries: 1, overlap_policy: 'queue' },
    average_runtime_seconds: 0.3,
    last_run_at: null,
    next_run_at: '2026-11-03T08:00:00.000Z',
    current_run_started_at: null,
    on_duty_days: 2,
    recent_runs: [],
    last_error: null,
  },
];

/** Neither handler reads the caller, so no stub guard; `app` is assigned in `beforeAll`. */
export const useSystemServicesApp = () => {
  const ctx = {
    app: undefined as unknown as INestApplication,
    service: autoMock<SystemServicesSiteService>(),
  };

  beforeAll(async () => {
    ctx.app = await createApiLayerApp({
      controllers: [SystemServicesSiteController],
      providers: [{ provide: SystemServicesSiteService, useValue: ctx.service }],
    });
  });
  afterAll(() => ctx.app.close());
  beforeEach(() => {
    ctx.service.triggerRun.mockReset().mockResolvedValue(ROSTER_RESPONSE as never);
    ctx.service.stopRun.mockReset().mockResolvedValue(ROSTER_RESPONSE as never);
  });

  return ctx;
};

/** `input` is the raw id, URL-encoded into the path. FAIL: service untouched. PASS: called once. */
export const describeServiceIdTable = (
  ctx: ReturnType<typeof useSystemServicesApp>,
  endpoint: (typeof ENDPOINTS)[number],
  fixtures: LayerFixture<string>[],
) => {
  fixtureCases(fixtures, (fixture) => {
    it('layer 2 — api', async () => {
      const outcome = await runApiLayer(ctx.app, { method: 'post', path: endpoint.path(fixture.input) });
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
