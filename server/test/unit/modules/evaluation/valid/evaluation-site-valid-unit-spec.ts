import { asCase } from '../../../../config/test-case';
import { LayerFixture, runApiLayer, autoMock } from '../../../../config/layer-harness';
import {
  ASSIGN_ENDPOINT,
  CREATE_ENDPOINT,
  ENDPOINTS,
  EVENT_ID_MAX,
  VALID_ASSIGN,
  VALID_CREATE,
  VALID_FORM_ID,
  describeBodyTable,
  useEvaluationApp,
  ASSIGNMENT_RESPONSE,
  CALLER,
  FORM_RESPONSE,
} from '../evaluation-site-support';
import { EvaluationFormStatus } from '../../../../../src/infastructures/prisma/common/client';
import { EvaluationFormService } from '../../../../../src/modules/evaluation/services/evaluation-form-service';
import { EvaluationSiteService } from '../../../../../src/modules/evaluation/services/evaluation-site-service';
import { EvaluationAssignmentSchema, EvaluationFormResponseSchema } from '../../../../../src/modules/evaluation/validators/evaluation-site-validator';
import {
  CONTROL_CHAR_PAYLOADS,
  PATH_TRAVERSAL_PAYLOADS,
  SQL_INJECTION_PAYLOADS,
  UNICODE_CONFUSABLE_PAYLOADS,
  XSS_PAYLOADS,
  specialCharacterSeries,
} from '../../../../config/security-payloads';

/**
 * Evaluation Module · Create / Assign Form — valid inputs.
 *
 * Every case here is a legitimate input the system must accept.
 * The invalid cases for this unit live in ../invalid/.
 */

/* ── input validation ────────────────────────────────────────────────────── */
{
  /**
   * Evaluation POST actions — input validation: the new questionnaire's title and
   * description, and the questionnaire and event an assignment joins, plus legitimate
   * inputs that must pass.
   */
  const createFixtures: LayerFixture[] = [
    { name: 'valid body', input: VALID_CREATE, expected: 'PASS' },
    { name: 'title alone, as the portal sends a new form', input: { title: VALID_CREATE.title }, expected: 'PASS' },
    { name: 'title with an empty description', input: { title: VALID_CREATE.title, description: '' }, expected: 'PASS' },
    { name: 'title at min length', input: { title: 'a' }, expected: 'PASS' },
    { name: 'title at max length', input: { title: 'a'.repeat(200) }, expected: 'PASS' },
    { name: 'title at max once trimmed', input: { title: `  ${'a'.repeat(200)}  ` }, expected: 'PASS' },
    { name: 'title with an apostrophe', input: { title: "Volunteers' Feedback" }, expected: 'PASS' },
    { name: 'title with a hyphen', input: { title: 'Post-Event Feedback' }, expected: 'PASS' },
    { name: 'title with a colon and brackets', input: { title: 'Feedback: Batch 2 (2026)' }, expected: 'PASS' },
    { name: 'title with accents', input: { title: 'Puna ng Señor' }, expected: 'PASS' },

    { name: 'description at max length', input: { ...VALID_CREATE, description: 'a'.repeat(2000) }, expected: 'PASS' },
    { name: 'description with line breaks', input: { ...VALID_CREATE, description: 'Line one\nLine two' }, expected: 'PASS' },
    { name: 'description with accents and emoji', input: { ...VALID_CREATE, description: 'Salamat, Señora! 🙏' }, expected: 'PASS' },
  ];

  const assignFixtures: LayerFixture[] = [
    { name: 'valid body', input: VALID_ASSIGN, expected: 'PASS' },
    { name: 'upper-case form id', input: { ...VALID_ASSIGN, form_id: VALID_FORM_ID.toUpperCase() }, expected: 'PASS' },
    { name: 'event id at the smallest', input: { ...VALID_ASSIGN, event_id: 1 }, expected: 'PASS' },
    { name: 'event id at the column limit', input: { ...VALID_ASSIGN, event_id: EVENT_ID_MAX }, expected: 'PASS' },
  ];

  describe('evaluation site · POST actions — input validation', () => {
    const ctx = useEvaluationApp();

    describe(CREATE_ENDPOINT.title, () => {
      describe('body', () => describeBodyTable(ctx, CREATE_ENDPOINT, createFixtures));
    });

    describe(ASSIGN_ENDPOINT.title, () => {
      describe('body', () => describeBodyTable(ctx, ASSIGN_ENDPOINT, assignFixtures));
    });

    asCase('valid', 'Staff submits a valid request').it.each(ENDPOINTS)('answers 201 in the success envelope · $title', async (endpoint) => {
      const outcome = await runApiLayer(ctx.app, { method: 'post', path: endpoint.path, body: endpoint.validBody });
      expect(outcome.status).toBe(201);
      expect(outcome.body).toEqual({ ok: true, message: endpoint.message, data: endpoint.response });
    });
  });
}

/* ── normalization ───────────────────────────────────────────────────────── */
{
  /**
   * Evaluation POST actions — normalisation: the schema trims the title and defaults the
   * description, assigning passes the caller from the token, and only the response
   * schema's fields leave the server.
   */
  describe('evaluation site · POST actions — normalisation', () => {
    const ctx = useEvaluationApp();

    const post = (path: string, body: object) => runApiLayer(ctx.app, { method: 'post', path, body });

    describe(CREATE_ENDPOINT.title, () => {
      asCase('valid', 'Staff submits a valid request').it('passes the body to the service', async () => {
        await post(CREATE_ENDPOINT.path, VALID_CREATE);
        expect(ctx.service.createForm).toHaveBeenCalledTimes(1);
        expect(ctx.service.createForm).toHaveBeenCalledWith(VALID_CREATE);
      });

      asCase('valid', 'Staff enters the title with surrounding spaces').it('trims the title', async () => {
        await post(CREATE_ENDPOINT.path, { ...VALID_CREATE, title: `  ${VALID_CREATE.title}\n` });
        expect(ctx.service.createForm.mock.calls[0][0].title).toBe(VALID_CREATE.title);
      });

      asCase('valid', 'Staff leaves the optional fields out').it('defaults the description to empty', async () => {
        await post(CREATE_ENDPOINT.path, { title: VALID_CREATE.title });
        expect(ctx.service.createForm.mock.calls[0][0].description).toBe('');
      });

      asCase('valid', 'Staff enters a description spanning several lines').it('keeps line breaks inside the description', async () => {
        const description = 'Line one\n\nLine three';
        await post(CREATE_ENDPOINT.path, { ...VALID_CREATE, description });
        expect(ctx.service.createForm.mock.calls[0][0].description).toBe(description);
      });

      asCase('valid', 'The service returns internal fields along with the result').it('keeps fields outside the response schema off the wire', async () => {
        ctx.service.createForm.mockResolvedValueOnce({ ...FORM_RESPONSE, internal_note: 'not for the portal' } as never);
        const outcome = await post(CREATE_ENDPOINT.path, VALID_CREATE);
        expect(outcome.status).toBe(201);
        expect(outcome.body.data).toEqual(FORM_RESPONSE);
      });
    });

    describe(ASSIGN_ENDPOINT.title, () => {
      asCase('valid', 'Staff submits a valid request').it('passes the body and the caller from the token to the service', async () => {
        await post(ASSIGN_ENDPOINT.path, VALID_ASSIGN);
        expect(ctx.service.assignForm).toHaveBeenCalledTimes(1);
        expect(ctx.service.assignForm).toHaveBeenCalledWith(VALID_ASSIGN, CALLER.sub);
      });

      asCase('valid', 'The service returns internal fields along with the result').it('keeps fields outside the response schema off the wire', async () => {
        ctx.service.assignForm.mockResolvedValueOnce({ ...ASSIGNMENT_RESPONSE, assigned_by_id: CALLER.sub } as never);
        const outcome = await post(ASSIGN_ENDPOINT.path, VALID_ASSIGN);
        expect(outcome.status).toBe(201);
        expect(outcome.body.data).toEqual(ASSIGNMENT_RESPONSE);
      });
    });
  });
}

/* ── security ────────────────────────────────────────────────────────────── */
{
  const createFixtures: LayerFixture[] = [

    // Free text: stored as data through Prisma and escaped by the clients when rendered.
    ...[...SQL_INJECTION_PAYLOADS, ...specialCharacterSeries(), ...UNICODE_CONFUSABLE_PAYLOADS, ...XSS_PAYLOADS, ...PATH_TRAVERSAL_PAYLOADS].map(
      (p): LayerFixture => ({
        name: `description ← ${p.category}: ${p.label}`,
        input: { ...VALID_CREATE, description: p.value },
        expected: 'PASS',
      }),
    ),
    // Control characters must not get through; a description can run over several lines,
    // so line breaks are the exception.
    ...CONTROL_CHAR_PAYLOADS.filter((p) => p.label === 'CRLF injection').map((p): LayerFixture => ({
      name: `description ← ${p.category}: ${p.label}`,
      input: { ...VALID_CREATE, description: p.value },
      expected: 'PASS',
      field: 'description',
    })),
  ];

  describe('evaluation site · POST actions — security', () => {
    const ctx = useEvaluationApp();

    describe(CREATE_ENDPOINT.title, () => {
      describe('body', () => describeBodyTable(ctx, CREATE_ENDPOINT, createFixtures));
    });

    describe.each(ENDPOINTS)('$title', (endpoint) => {
    });

    // The controller's service is mocked above; what gets written lives in the real one.
    describe('real service', () => {
      const NOW = new Date('2026-10-30T08:00:00.000Z');

      const assignmentRow = (write: any) => ({
        evaluation_assignment_id: '6a0c1e2f-3b4d-4e5f-9a6b-7c8d9e0f1a2b',
        form_id: write.form_id,
        form: { title: VALID_CREATE.title, status: EvaluationFormStatus.DRAFT },
        event: {
          event_id: write.event_id,
          title: 'Coastal Clean-up Drive',
          location: 'Brgy. Lahug, Cebu City',
          status: 'Upcoming',
          event_started: new Date('2026-12-01T01:00:00.000Z'),
          event_ended: new Date('2026-12-01T05:00:00.000Z'),
          participants: 40,
        },
        assigned_by: write.assigned_by_id ? { firstname: 'Ada', lastname: 'Lovelace' } : null,
        createdAt: NOW,
      });

      const build = ({ form = { status: EvaluationFormStatus.DRAFT } as object | null, eventExists = true } = {}) => {
        const repository = autoMock<any>({
          createForm: jest.fn(async (write: object) => ({
            evaluation_form_id: VALID_FORM_ID,
            is_default: false,
            createdAt: NOW,
            updatedAt: NOW,
            ...write,
          })),
          findForm: jest.fn().mockResolvedValue(form),
          eventExists: jest.fn().mockResolvedValue(eventExists),
          upsertAssignment: jest.fn(async (write: object) => assignmentRow(write)),
        });
        const service = new EvaluationSiteService(repository, new EvaluationFormService(), autoMock<any>());
        return { service, repository };
      };

      describe('createForm', () => {
        asCase('valid', 'Director creates an evaluation form').it('always opens empty and as a draft, whatever else reaches it', async () => {
          const { service, repository } = build();
          await service.createForm({ ...VALID_CREATE, status: 'PUBLISHED', questions: [{}] } as never);
          expect(repository.createForm).toHaveBeenCalledWith({
            title: VALID_CREATE.title,
            description: VALID_CREATE.description,
            header_typography: { font_family: 'inter', font_size: 'xl' },
            questions: [],
            status: EvaluationFormStatus.DRAFT,
          });
        });

        asCase('valid', 'Director creates an evaluation form').it('builds a questionnaire the response schema accepts', async () => {
          const { service } = build();
          const dto = await service.createForm(VALID_CREATE as never);
          expect(EvaluationFormResponseSchema.safeParse(dto).success).toBe(true);
          expect(dto).toMatchObject({ is_default: false, assigned_events: 0, response_count: 0 });
        });
      });

      describe('assignForm', () => {
        asCase('valid', 'Director assigns a form to an event').it('records the caller as the assigner', async () => {
          const { service, repository } = build();
          await service.assignForm(VALID_ASSIGN, CALLER.sub);
          expect(repository.upsertAssignment).toHaveBeenCalledWith({ ...VALID_ASSIGN, assigned_by_id: CALLER.sub });
        });

        asCase('valid', 'Director assigns a draft form to an event').it('allows a draft ahead of publishing, as the service documents', async () => {
          const { service, repository } = build();
          const dto = await service.assignForm(VALID_ASSIGN, CALLER.sub);
          expect(repository.upsertAssignment).toHaveBeenCalledTimes(1);
          expect(dto.form_status).toBe(EvaluationFormStatus.DRAFT);
        });

        asCase('valid', 'Director assigns a form to an event').it('builds an assignment the response schema accepts, with or without an assigner', async () => {
          const { service } = build();
          const withAssigner = await service.assignForm(VALID_ASSIGN, CALLER.sub);
          const without = await service.assignForm(VALID_ASSIGN, null);
          expect(EvaluationAssignmentSchema.safeParse(withAssigner).success).toBe(true);
          expect(withAssigner.assigned_by).toBe('Ada Lovelace');
          expect(EvaluationAssignmentSchema.safeParse(without).success).toBe(true);
          expect(without.assigned_by).toBeNull();
        });
      });
    });
  });
}
