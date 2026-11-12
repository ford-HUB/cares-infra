import { INestApplication } from '@nestjs/common';
import { SystemDiagnosticsSiteController } from '../../../../src/modules/system-diagnostics/controllers/system-diagnostics-site-controller';
import { SystemDiagnosticsSiteService } from '../../../../src/modules/system-diagnostics/services/system-diagnostics-site-service';
import { autoMock, createApiLayerApp } from '../../../config/layer-harness';
import { setCaseUnit } from '../../../config/test-case';

setCaseUnit({ module: 'System Module', unit: 'Diagnostics', prefix: 'DIAG' });

/**
 * Shared by every spec in this folder — Run checks on the portal's Diagnostics screen
 * (System):
 *   POST /api/v1/system-diagnostics/check  (runDiagnostics: runs every probe now)
 *
 * The handler reads no body, query or path param, so there is no request schema and
 * no layer 1. These specs cover the endpoint itself and what it sends back.
 * `@RequirePermission` is not exercised: the global guards are out of scope for these
 * layers.
 *
 * Not a spec itself (no `-unit-spec.ts` suffix); attack strings still come only from
 * `config/security-payloads.ts`.
 */
export const CHECK_PATH = '/api/v1/system-diagnostics/check';

export const DIAGNOSTICS_RESPONSE = {
  report: {
    checked_at: '2026-11-03T08:00:00.000Z',
    duration_ms: 42,
    overall: 'healthy',
    source: 'manual',
    checks: [
      { id: 'database', group: 'database', name: 'Database', status: 'ok', latency_ms: 3, detail: 'Answered SELECT 1' },
    ],
  },
  history: [{ checked_at: '2026-11-03T07:59:00.000Z', overall: 'healthy', failing: 0 }],
};

/**
 * Boots `SystemDiagnosticsSiteController` with a mocked service for the enclosing
 * `describe`. The handler does not read the caller, so no stand-in guard is needed.
 * Read `app` inside tests — it is assigned in `beforeAll`.
 */
export const useSystemDiagnosticsApp = () => {
  const ctx = {
    app: undefined as unknown as INestApplication,
    service: autoMock<SystemDiagnosticsSiteService>(),
  };

  beforeAll(async () => {
    ctx.app = await createApiLayerApp({
      controllers: [SystemDiagnosticsSiteController],
      providers: [{ provide: SystemDiagnosticsSiteService, useValue: ctx.service }],
    });
  });
  afterAll(() => ctx.app.close());
  beforeEach(() => {
    ctx.service.runDiagnostics.mockReset().mockResolvedValue(DIAGNOSTICS_RESPONSE as never);
  });

  return ctx;
};
