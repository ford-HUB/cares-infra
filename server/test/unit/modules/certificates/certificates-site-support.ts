import { ExecutionContext, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { RoleType } from '../../../../src/infastructures/prisma/common/client';
import { CertificateDeploymentIdParamSchema } from '../../../../src/modules/certificate-deployments/validators/certificate-deployments-site-validator';
import { CertificatesSiteController } from '../../../../src/modules/certificates/controllers/certificates-site-controller';
import { CertificatesSiteService } from '../../../../src/modules/certificates/services/certificates-site-service';
import {
  LayerFixture,
  autoMock,
  createApiLayerApp,
  expectLayer,
  expectValidationEnvelope,
  runApiLayer,
  runSchemaLayer,
} from '../../../config/layer-harness';
import { fixtureCases, setCaseUnit } from '../../../config/test-case';

setCaseUnit({ module: 'Certificate Module', unit: 'Remind Pending', prefix: 'CERT-REMIND' });

/**
 * Shared by every spec in this folder — Remind on the portal's Manage Certificate module:
 *   POST /api/v1/certificate-deployments/:id/remind  (remindPending: id uuid, no body)
 *
 * `@Roles` and `@RequirePermission` are not exercised: the global guards are out of
 * scope for these layers.
 *
 * Not a spec itself (no `-unit-spec.ts` suffix); attack strings still come only
 * from `config/security-payloads.ts`.
 */
export const VALID_DEPLOYMENT_ID = '6a0c1e2f-3b4d-4e5f-9a6b-7c8d9e0f1a2b';
export const CALLER = { sub: 'caller-user-id', role_type: RoleType.DIRECTOR };

export const remindPath = (id: string = VALID_DEPLOYMENT_ID) =>
  `/api/v1/certificate-deployments/${encodeURIComponent(id)}/remind`;

export const REMIND_TITLE = 'POST /api/v1/certificate-deployments/:id/remind';

export const REMIND_RESPONSE = {
  deployment_id: VALID_DEPLOYMENT_ID,
  reminded: 3,
  awaiting_feedback: 2,
  awaiting_attendance: 1,
};

/**
 * Boots `CertificatesSiteController` with a mocked service for the enclosing `describe`.
 * The handler reads the caller, so a stand-in for the global JWT guard puts `CALLER` on
 * the request. Read `app` inside tests — it is assigned in `beforeAll`.
 */
export const useCertificatesApp = () => {
  const ctx = {
    app: undefined as unknown as INestApplication,
    service: autoMock<CertificatesSiteService>(),
  };

  beforeAll(async () => {
    ctx.app = await createApiLayerApp({
      controllers: [CertificatesSiteController],
      providers: [
        { provide: CertificatesSiteService, useValue: ctx.service },
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
    ctx.service.remindPending.mockReset().mockResolvedValue(REMIND_RESPONSE as never);
  });

  return ctx;
};

/**
 * Deployment id fixtures (the fixture `input` is the raw id, URL-encoded into the path)
 * through both layers. A FAIL must come back in the validation envelope without reaching
 * the service; a PASS must reach it exactly once.
 */
export const describeDeploymentIdTable = (ctx: ReturnType<typeof useCertificatesApp>, fixtures: LayerFixture<string>[]) => {
  fixtureCases(fixtures, (fixture) => {
    it('layer 1 — schema', async () => {
      expectLayer(await runSchemaLayer(CertificateDeploymentIdParamSchema, fixture.input), fixture);
    });

    it('layer 2 — api', async () => {
      const outcome = await runApiLayer(ctx.app, { method: 'post', path: remindPath(fixture.input) });
      expectLayer(outcome, fixture);

      if (fixture.expected === 'FAIL') {
        expectValidationEnvelope(outcome);
        expect(ctx.service.remindPending).not.toHaveBeenCalled();
      } else {
        expect(ctx.service.remindPending).toHaveBeenCalledTimes(1);
      }
    });
  });
};
