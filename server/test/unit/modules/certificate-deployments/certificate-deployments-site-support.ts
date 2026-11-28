import { ExecutionContext, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { RoleType } from '../../../../src/infastructures/prisma/common/client';
import { CertificateDeploymentsSiteController } from '../../../../src/modules/certificate-deployments/controllers/certificate-deployments-site-controller';
import { CertificateDeploymentsSiteService } from '../../../../src/modules/certificate-deployments/services/certificate-deployments-site-service';
import { DeployCertificateSchema } from '../../../../src/modules/certificate-deployments/validators/certificate-deployments-site-validator';
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

setCaseUnit({ module: 'Certificate Module', unit: 'Deploy Certificate', prefix: 'CERT-DEPLOY' });

export const DEPLOYMENTS_PATH = '/api/v1/certificate-deployments';
export const CALLER = { sub: 'caller-user-id', role_type: RoleType.DIRECTOR };

export const VALID_TEMPLATE_ID = 'b3f1c2d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d';
export const VALID_DEPLOY = { certificate_template_id: VALID_TEMPLATE_ID, event_id: 5 };

/** Postgres `Int` max, the column behind `event_id`. */
export const EVENT_ID_MAX = 2147483647;

/** Template design a deployment snapshots at deploy time. */
export const STORED_DESIGN = {
  accent: 'rose',
  frame: 'plain',
  layout: {
    headline: { x: 50, y: 25 },
    title: { x: 50, y: 43 },
    body: { x: 50, y: 58 },
    seal: { x: 50, y: 73 },
    signatures: { x: 50, y: 88 },
  },
  font: 'default',
  element_fonts: {},
  element_sizes: {},
  element_widths: {},
  element_heights: {},
  element_aligns: {},
  element_weights: {},
  element_underlines: {},
  title: 'Volunteer Appreciation',
  headline: 'Certificate of Appreciation',
  body: 'This certifies that {{recipient}} took part in {{event}} held on {{date}}.',
  show_seal: false,
  seal_label: '',
  images: [],
};

export const DEPLOYMENT_RESPONSE = {
  id: '6a0c1e2f-3b4d-4e5f-9a6b-7c8d9e0f1a2b',
  reference: 'DC-2026-001',
  template_id: VALID_TEMPLATE_ID,
  template_name: 'Volunteer Appreciation',
  category: 'appreciation',
  orientation: 'landscape',
  design: {
    ...STORED_DESIGN,
    signatories: [
      {
        id: 'signatory-id',
        coordinator_id: 'coordinator-user-id',
        name: 'Ada Lovelace',
        title: 'Program Director',
        department: 'UCLM CARES',
        signature_token: '{{signature-image}}',
        has_signature: true,
      },
    ],
  },
  event: {
    id: '5',
    name: 'Coastal Clean-up Drive',
    venue: 'Brgy. Lahug, Cebu City',
    date: '2026-10-30T01:00:00.000Z',
  },
  status: 'scheduled',
  participants: 40,
  distributed: 0,
  claimed: 0,
  deployed_at: '2026-10-30T08:00:00.000Z',
  deployed_by: 'Ada Lovelace',
};

/** Stub guard sets `CALLER` (the handler reads it); `app` is assigned in `beforeAll`. */
export const useDeploymentsApp = () => {
  const ctx = {
    app: undefined as unknown as INestApplication,
    service: autoMock<CertificateDeploymentsSiteService>(),
  };

  beforeAll(async () => {
    ctx.app = await createApiLayerApp({
      controllers: [CertificateDeploymentsSiteController],
      providers: [
        { provide: CertificateDeploymentsSiteService, useValue: ctx.service },
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
    ctx.service.deploy.mockReset().mockResolvedValue(DEPLOYMENT_RESPONSE as never);
  });

  return ctx;
};

/** FAIL: validation envelope, service untouched. PASS: service called once. */
export const describeDeployTable = (ctx: ReturnType<typeof useDeploymentsApp>, fixtures: LayerFixture[]) => {
  fixtureCases(fixtures, (fixture) => {
    it('layer 1 — schema', async () => {
      expectLayer(await runSchemaLayer(DeployCertificateSchema, fixture.input), fixture);
    });

    it('layer 2 — api', async () => {
      const outcome = await runApiLayer(ctx.app, { method: 'post', path: DEPLOYMENTS_PATH, body: fixture.input });
      expectLayer(outcome, fixture);

      if (fixture.expected === 'FAIL') {
        expectValidationEnvelope(outcome);
        expect(ctx.service.deploy).not.toHaveBeenCalled();
      } else {
        expect(ctx.service.deploy).toHaveBeenCalledTimes(1);
      }
    });
  });
};
