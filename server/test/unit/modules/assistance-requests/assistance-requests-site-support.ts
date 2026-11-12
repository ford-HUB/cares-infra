import { INestApplication } from '@nestjs/common';
import {
  AssistanceAssessmentStatus,
  AssistanceCategory,
  AssistanceRequestStatus,
  AssistanceUrgency,
} from '../../../../src/infastructures/prisma/common/client';
import { AssistanceRequestsSiteController } from '../../../../src/modules/assistance-requests/controllers/assistance-requests-site-controller';
import { AssistanceRequestsSiteService } from '../../../../src/modules/assistance-requests/services/assistance-requests-site-service';
import {
  ApproveAssistanceRequestSchema,
  AssistanceRequestIdParamSchema,
  DeclineAssistanceRequestSchema,
} from '../../../../src/modules/assistance-requests/validators/assistance-requests-site-validator';
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

setCaseUnit({ module: 'Users Module', unit: 'Assistance Request Decision', prefix: 'ASSIST' });

/**
 * Shared by every spec in this folder — the two decisions on Users → Request in the portal:
 *   POST /api/v1/assistance-requests/:id/approve  (approve: id uuid + ApproveAssistanceRequestSchema)
 *   POST /api/v1/assistance-requests/:id/decline  (decline: id uuid + DeclineAssistanceRequestSchema)
 *
 * `@Roles` and `@RequirePermission` are not exercised: the global guards are out of
 * scope for these layers.
 *
 * Not a spec itself (no `-unit-spec.ts` suffix); attack strings still come only
 * from `config/security-payloads.ts`.
 */
export const VALID_REQUEST_ID = 'b3f1c2d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d';

export const VALID_APPROVE = { note: 'Please bring a valid ID when you claim it.' };
export const VALID_DECLINE = { reason: 'This household was assisted last month.' };

const requestPath = (id: string, action: string) =>
  `/api/v1/assistance-requests/${encodeURIComponent(id)}/${action}`;

export const APPROVE_ENDPOINT = {
  title: 'POST /api/v1/assistance-requests/:id/approve',
  path: (id: string = VALID_REQUEST_ID) => requestPath(id, 'approve'),
  handler: 'approve',
  message: 'Request approved',
  schema: ApproveAssistanceRequestSchema,
  validBody: VALID_APPROVE,
} as const;
export const DECLINE_ENDPOINT = {
  title: 'POST /api/v1/assistance-requests/:id/decline',
  path: (id: string = VALID_REQUEST_ID) => requestPath(id, 'decline'),
  handler: 'decline',
  message: 'Request declined',
  schema: DeclineAssistanceRequestSchema,
  validBody: VALID_DECLINE,
} as const;
export const ENDPOINTS = [APPROVE_ENDPOINT, DECLINE_ENDPOINT];

export const REQUEST_RESPONSE = {
  assistance_request_id: VALID_REQUEST_ID,
  reference_number: 7,
  reference_label: 'CARES-AR-2026-0007',
  requester_id: 'requester-user-id',
  requester_firstname: 'Ada',
  requester_lastname: 'Lovelace',
  requester_email: 'ada@cares.ph',
  requester_role_type: 'BENEFICIARY',
  requester_barangay: 'Lahug',
  title: 'Medicine for my mother',
  category: AssistanceCategory.MEDICAL,
  description: 'Maintenance medicine for the next three months.',
  urgency: AssistanceUrgency.HIGH,
  household_size: 4,
  location_latitude: null,
  location_longitude: null,
  location_details: null,
  status: AssistanceRequestStatus.UNDER_REVIEW,
  assessment_status: AssistanceAssessmentStatus.NOT_STARTED,
  assessment_date: null,
  status_note: null,
  attachments: [
    { assistance_request_attachment_id: 'attachment-id', name: 'prescription.pdf', mime: 'application/pdf', size_bytes: 2048 },
  ],
  screened_at: null,
  decided_at: null,
  released_at: null,
  cancelled_at: null,
  cancel_reason: null,
  created_at: '2026-10-30T08:00:00.000Z',
  updated_at: '2026-10-30T08:00:00.000Z',
};

/**
 * Boots `AssistanceRequestsSiteController` with a mocked service for the enclosing
 * `describe`. Neither handler reads the caller, so no stand-in guard is needed. Read
 * `app` inside tests — it is assigned in `beforeAll`.
 */
export const useAssistanceRequestsApp = () => {
  const ctx = {
    app: undefined as unknown as INestApplication,
    service: autoMock<AssistanceRequestsSiteService>(),
  };

  beforeAll(async () => {
    ctx.app = await createApiLayerApp({
      controllers: [AssistanceRequestsSiteController],
      providers: [{ provide: AssistanceRequestsSiteService, useValue: ctx.service }],
    });
  });
  afterAll(() => ctx.app.close());
  beforeEach(() => {
    for (const { handler } of ENDPOINTS) {
      ctx.service[handler].mockReset().mockResolvedValue(REQUEST_RESPONSE as never);
    }
  });

  return ctx;
};

/**
 * Request id fixtures (the fixture `input` is the raw id, URL-encoded into the path)
 * through both layers, with a valid body so the id is the only thing under test. A FAIL
 * must come back in the validation envelope without reaching the service; a PASS must
 * reach it exactly once.
 */
export const describeRequestIdTable = (
  ctx: ReturnType<typeof useAssistanceRequestsApp>,
  endpoint: (typeof ENDPOINTS)[number],
  fixtures: LayerFixture<string>[],
) => {
  fixtureCases(fixtures, (fixture) => {
    it('layer 1 — schema', async () => {
      expectLayer(await runSchemaLayer(AssistanceRequestIdParamSchema, fixture.input), fixture);
    });

    it('layer 2 — api', async () => {
      const outcome = await runApiLayer(ctx.app, {
        method: 'post',
        path: endpoint.path(fixture.input),
        body: endpoint.validBody,
      });
      expectLayer(outcome, fixture);

      if (fixture.expected === 'FAIL') {
        expectValidationEnvelope(outcome);
        expect(ctx.service[endpoint.handler]).not.toHaveBeenCalled();
      } else {
        expect(ctx.service[endpoint.handler]).toHaveBeenCalledTimes(1);
      }
    });
  });
};

/** Body fixtures through both layers, against a valid request id. */
export const describeBodyTable = (
  ctx: ReturnType<typeof useAssistanceRequestsApp>,
  endpoint: (typeof ENDPOINTS)[number],
  fixtures: LayerFixture[],
) => {
  fixtureCases(fixtures, (fixture) => {
    it('layer 1 — schema', async () => {
      expectLayer(await runSchemaLayer(endpoint.schema, fixture.input), fixture);
    });

    it('layer 2 — api', async () => {
      const outcome = await runApiLayer(ctx.app, {
        method: 'post',
        path: endpoint.path(),
        body: fixture.input,
      });
      expectLayer(outcome, fixture);

      if (fixture.expected === 'FAIL') {
        expectValidationEnvelope(outcome);
        expect(ctx.service[endpoint.handler]).not.toHaveBeenCalled();
      } else {
        expect(ctx.service[endpoint.handler]).toHaveBeenCalledTimes(1);
      }
    });
  });
};
