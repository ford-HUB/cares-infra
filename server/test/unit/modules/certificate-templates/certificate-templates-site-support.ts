import { ExecutionContext, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { RoleType } from '../../../../src/infastructures/prisma/common/client';
import { CertificateTemplatesSiteController } from '../../../../src/modules/certificate-templates/controllers/certificate-templates-site-controller';
import { CertificateTemplatesSiteService } from '../../../../src/modules/certificate-templates/services/certificate-templates-site-service';
import { CreateCertificateTemplateSchema } from '../../../../src/modules/certificate-templates/validators/certificate-templates-site-validator';
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

setCaseUnit({ module: 'Certificate Module', unit: 'Certificate Template', prefix: 'CERT-TPL' });

/**
 * Shared by every spec in this folder — New Template on the Customization screen of the
 * portal's Manage Certificate module:
 *   POST /api/v1/certificate-templates  (createTemplate: CreateCertificateTemplateSchema)
 *
 * `@Roles` and `@RequirePermission` are not exercised: the global guards are out of
 * scope for these layers.
 *
 * Not a spec itself (no `-unit-spec.ts` suffix); attack strings still come only
 * from `config/security-payloads.ts`.
 */
export const TEMPLATES_PATH = '/api/v1/certificate-templates';
export const CALLER = { sub: 'caller-user-id', role_type: RoleType.DIRECTOR };

export const VALID_TEMPLATE = {
  name: 'Volunteer Appreciation',
  description: 'Given to volunteers at the end of a drive.',
  category: 'appreciation',
  orientation: 'landscape',
};

export const TEMPLATE_RESPONSE = {
  id: 'b3f1c2d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
  reference: 'CT-2026-001',
  name: VALID_TEMPLATE.name,
  description: VALID_TEMPLATE.description,
  category: VALID_TEMPLATE.category,
  status: 'draft',
  orientation: VALID_TEMPLATE.orientation,
  issued: 0,
  deployed_events: 0,
  design: {
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
    title: VALID_TEMPLATE.name,
    headline: 'Certificate of Appreciation',
    body: 'This certifies that {{recipient}} took part in {{event}} held on {{date}}.',
    show_seal: false,
    seal_label: '',
    images: [],
  },
  signatories: [
    {
      id: 'signatory-id',
      coordinator_id: CALLER.sub,
      name: 'Ada Lovelace',
      title: 'Program Director',
      department: 'UCLM CARES',
      signature_token: '{{signature-image}}',
      has_signature: false,
    },
  ],
  updated_at: '2026-10-30T08:00:00.000Z',
  updated_by: 'Ada Lovelace',
};

/**
 * Boots `CertificateTemplatesSiteController` with a mocked service for the enclosing
 * `describe`. The handler reads the caller, so a stand-in for the global JWT guard puts
 * `CALLER` on the request. Read `app` inside tests — it is assigned in `beforeAll`.
 */
export const useCertificateTemplatesApp = () => {
  const ctx = {
    app: undefined as unknown as INestApplication,
    service: autoMock<CertificateTemplatesSiteService>(),
  };

  beforeAll(async () => {
    ctx.app = await createApiLayerApp({
      controllers: [CertificateTemplatesSiteController],
      providers: [
        { provide: CertificateTemplatesSiteService, useValue: ctx.service },
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
    ctx.service.createTemplate.mockReset().mockResolvedValue(TEMPLATE_RESPONSE as never);
  });

  return ctx;
};

/**
 * Body fixtures through both layers. A FAIL must come back in the validation envelope
 * without reaching the service; a PASS must reach it exactly once.
 */
export const describeTemplateTable = (ctx: ReturnType<typeof useCertificateTemplatesApp>, fixtures: LayerFixture[]) => {
  fixtureCases(fixtures, (fixture) => {
    it('layer 1 — schema', async () => {
      expectLayer(await runSchemaLayer(CreateCertificateTemplateSchema, fixture.input), fixture);
    });

    it('layer 2 — api', async () => {
      const outcome = await runApiLayer(ctx.app, { method: 'post', path: TEMPLATES_PATH, body: fixture.input });
      expectLayer(outcome, fixture);

      if (fixture.expected === 'FAIL') {
        expectValidationEnvelope(outcome);
        expect(ctx.service.createTemplate).not.toHaveBeenCalled();
      } else {
        expect(ctx.service.createTemplate).toHaveBeenCalledTimes(1);
      }
    });
  });
};
