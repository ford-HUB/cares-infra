import { ExecutionContext, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { EvaluationFormStatus, RoleType } from '../../../../src/infastructures/prisma/common/client';
import { EvaluationSiteController } from '../../../../src/modules/evaluation/controllers/evaluation-site-controller';
import { EvaluationSiteService } from '../../../../src/modules/evaluation/services/evaluation-site-service';
import {
  AssignEvaluationFormSchema,
  CreateEvaluationFormSchema,
} from '../../../../src/modules/evaluation/validators/evaluation-site-validator';
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

setCaseUnit({ module: 'Evaluation Module', unit: 'Create / Assign Form', prefix: 'EVAL' });

/**
 * Shared by every spec in this folder — the two POSTs on the portal's Evaluation module:
 *   POST /api/v1/evaluation/forms        (createForm: CreateEvaluationFormSchema)
 *   POST /api/v1/evaluation/assignments  (assignForm: AssignEvaluationFormSchema)
 *
 * `@Roles` is not exercised: the global guards are out of scope for these layers.
 *
 * Not a spec itself (no `-unit-spec.ts` suffix); attack strings still come only
 * from `config/security-payloads.ts`.
 */
export const CALLER = { sub: 'caller-user-id', role_type: RoleType.DIRECTOR };

export const VALID_FORM_ID = 'b3f1c2d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d';

/** The largest value the `Int` column behind an event id can hold. */
export const EVENT_ID_MAX = 2147483647;

export const VALID_CREATE = { title: 'Post-Event Feedback', description: 'Asked after every outreach event.' };
export const VALID_ASSIGN = { form_id: VALID_FORM_ID, event_id: 5 };

export const FORM_RESPONSE = {
  evaluation_form_id: VALID_FORM_ID,
  title: VALID_CREATE.title,
  description: VALID_CREATE.description,
  header_typography: { font_family: 'inter', font_size: 'xl' },
  questions: [],
  status: EvaluationFormStatus.DRAFT,
  is_default: false,
  assigned_events: 0,
  response_count: 0,
  created_at: '2026-10-30T08:00:00.000Z',
  updated_at: '2026-10-30T08:00:00.000Z',
};

export const ASSIGNMENT_RESPONSE = {
  evaluation_assignment_id: '6a0c1e2f-3b4d-4e5f-9a6b-7c8d9e0f1a2b',
  form_id: VALID_FORM_ID,
  form_title: VALID_CREATE.title,
  form_status: EvaluationFormStatus.DRAFT,
  event_id: VALID_ASSIGN.event_id,
  event_title: 'Coastal Clean-up Drive',
  event_location: 'Brgy. Lahug, Cebu City',
  event_status: 'Upcoming',
  event_started: '2026-12-01T01:00:00.000Z',
  event_ended: '2026-12-01T05:00:00.000Z',
  participants: 40,
  assigned_by: 'Ada Lovelace',
  assigned_at: '2026-10-30T08:00:00.000Z',
};

export const CREATE_ENDPOINT = {
  title: 'POST /api/v1/evaluation/forms',
  path: '/api/v1/evaluation/forms',
  handler: 'createForm',
  message: 'Questionnaire created',
  schema: CreateEvaluationFormSchema,
  validBody: VALID_CREATE,
  response: FORM_RESPONSE,
} as const;
export const ASSIGN_ENDPOINT = {
  title: 'POST /api/v1/evaluation/assignments',
  path: '/api/v1/evaluation/assignments',
  handler: 'assignForm',
  message: 'Questionnaire assigned',
  schema: AssignEvaluationFormSchema,
  validBody: VALID_ASSIGN,
  response: ASSIGNMENT_RESPONSE,
} as const;
export const ENDPOINTS = [CREATE_ENDPOINT, ASSIGN_ENDPOINT];

/**
 * Boots `EvaluationSiteController` with a mocked service for the enclosing `describe`.
 * Assigning reads `user.sub`, so a stand-in for the global JWT guard puts `CALLER` on
 * the request. Read `app` inside tests — it is assigned in `beforeAll`.
 */
export const useEvaluationApp = () => {
  const ctx = {
    app: undefined as unknown as INestApplication,
    service: autoMock<EvaluationSiteService>(),
  };

  beforeAll(async () => {
    ctx.app = await createApiLayerApp({
      controllers: [EvaluationSiteController],
      providers: [
        { provide: EvaluationSiteService, useValue: ctx.service },
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
    ctx.service.createForm.mockReset().mockResolvedValue(FORM_RESPONSE as never);
    ctx.service.assignForm.mockReset().mockResolvedValue(ASSIGNMENT_RESPONSE as never);
  });

  return ctx;
};

/**
 * Body fixtures through both layers. A FAIL must come back in the validation envelope
 * without reaching the service; a PASS must reach it exactly once.
 */
export const describeBodyTable = (
  ctx: ReturnType<typeof useEvaluationApp>,
  endpoint: (typeof ENDPOINTS)[number],
  fixtures: LayerFixture[],
) => {
  fixtureCases(fixtures, (fixture) => {
    it('layer 1 — schema', async () => {
      expectLayer(await runSchemaLayer(endpoint.schema, fixture.input), fixture);
    });

    it('layer 2 — api', async () => {
      const outcome = await runApiLayer(ctx.app, { method: 'post', path: endpoint.path, body: fixture.input });
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
