import { asCase } from '../../../../config/test-case';
import { NotFoundException } from '@nestjs/common';
import {
  expectSafeErrorEnvelope,
  runApiLayer,
  LayerFixture,
  autoMock,
  expectValidationEnvelope,
  runSchemaLayer,
  withPollution,
} from '../../../../config/layer-harness';
import {
  ASSIGN_ENDPOINT,
  ENDPOINTS,
  useEvaluationApp,
  CREATE_ENDPOINT,
  EVENT_ID_MAX,
  VALID_ASSIGN,
  VALID_CREATE,
  VALID_FORM_ID,
  describeBodyTable,
  CALLER,
} from '../evaluation-site-support';
import { EvaluationFormStatus, RoleType } from '../../../../../src/infastructures/prisma/common/client';
import { ROLES_KEY } from '../../../../../src/shared/decorators/roles-decorator';
import { EvaluationSiteController } from '../../../../../src/modules/evaluation/controllers/evaluation-site-controller';
import { EvaluationFormService } from '../../../../../src/modules/evaluation/services/evaluation-form-service';
import { EvaluationSiteService } from '../../../../../src/modules/evaluation/services/evaluation-site-service';
import {
  CONTROL_CHAR_PAYLOADS,
  HOSTILE_STRINGS,
  MASS_ASSIGNMENT_KEYS,
  OPERATOR_INJECTION_PAYLOADS,
  PROTOTYPE_POLLUTION_BODIES,
  SQL_INJECTION_PAYLOADS,
  XSS_PAYLOADS,
  specialCharacterSeries,
} from '../../../../config/security-payloads';

/**
 * Evaluation Module · Create / Assign Form — invalid inputs.
 *
 * Every case here is an intentionally wrong input. A case Passes when the system
 * refuses it exactly as stated — a rejection as expected is the correct result.
 * The valid cases for this unit live in ../valid/.
 */

/* ── error handling ──────────────────────────────────────────────────────── */
{
  /**
   * Evaluation POST actions — error handling: unexpected service errors and a response the
   * serializer refuses are masked as a generic 500 with nothing leaked, and the service's
   * deliberate HttpExceptions keep their status and message through the envelope.
   */
  const DELIBERATE_ERRORS = [
    { title: '404 for an unknown questionnaire', error: new NotFoundException('Questionnaire not found') },
    { title: '404 for an unknown event', error: new NotFoundException('Event not found') },
  ];

  describe('evaluation site · POST actions — error handling', () => {
    const ctx = useEvaluationApp();

    describe.each(ENDPOINTS)('$title', (endpoint) => {
      const send = () => runApiLayer(ctx.app, { method: 'post', path: endpoint.path, body: endpoint.validBody });

      asCase('invalid', 'The service fails with an unexpected internal or database error').it('masks an unexpected service error as a 500 without leaking detail', async () => {
        ctx.service[endpoint.handler].mockRejectedValueOnce(new Error('syntax error at or near "OR"') as never);
        const outcome = await send();
        expect(outcome.status).toBe(500);
        expectSafeErrorEnvelope(outcome);
        expect(outcome.body).toEqual({ ok: false, message: 'Internal server error' });
      });

      asCase('invalid', 'The service returns data that breaks the response schema').it('masks a response the serializer refuses as a 500', async () => {
        ctx.service[endpoint.handler].mockResolvedValueOnce({ unexpected: true } as never);
        const outcome = await send();
        expect(outcome.status).toBe(500);
        expect(outcome.body).toEqual({ ok: false, message: 'Internal server error' });
      });
    });

    asCase('invalid', 'The service refuses the request with a deliberate HTTP error (each kind)', 'Each deliberate error keeps its status and message in the { ok: false } envelope').it.each(DELIBERATE_ERRORS)('assign keeps $title', async ({ error }) => {
      ctx.service.assignForm.mockRejectedValueOnce(error as never);
      const outcome = await runApiLayer(ctx.app, { method: 'post', path: ASSIGN_ENDPOINT.path, body: ASSIGN_ENDPOINT.validBody });
      expect(outcome.status).toBe(error.getStatus());
      expectSafeErrorEnvelope(outcome);
      expect(outcome.body.message).toBe(error.message);
    });
  });
}

/* ── input validation ────────────────────────────────────────────────────── */
{
  /**
   * Evaluation POST actions — input validation: the new questionnaire's title and
   * description, and the questionnaire and event an assignment joins, plus legitimate
   * inputs that must pass.
   */
  const createFixtures: LayerFixture[] = [

    { name: 'title missing', input: { description: VALID_CREATE.description }, expected: 'FAIL', field: 'title' },
    { name: 'title empty', input: { title: '' }, expected: 'FAIL', field: 'title', message: 'Title is required' },
    { name: 'title whitespace-only', input: { title: '   ' }, expected: 'FAIL', field: 'title', message: 'Title is required' },
    { name: 'title over max', input: { title: 'a'.repeat(201) }, expected: 'FAIL', field: 'title' },
    { name: 'description over max', input: { ...VALID_CREATE, description: 'a'.repeat(2001) }, expected: 'FAIL', field: 'description' },
  ];

  const assignFixtures: LayerFixture[] = [

    { name: 'form id missing', input: { event_id: VALID_ASSIGN.event_id }, expected: 'FAIL', field: 'form_id' },
    { name: 'form id empty', input: { ...VALID_ASSIGN, form_id: '' }, expected: 'FAIL', field: 'form_id', message: 'Questionnaire is required' },
    { name: 'form id not a uuid', input: { ...VALID_ASSIGN, form_id: 'form-1' }, expected: 'FAIL', field: 'form_id' },
    { name: 'form id missing a character', input: { ...VALID_ASSIGN, form_id: VALID_FORM_ID.slice(0, -1) }, expected: 'FAIL', field: 'form_id' },
    { name: 'form id without hyphens', input: { ...VALID_ASSIGN, form_id: VALID_FORM_ID.replace(/-/g, '') }, expected: 'FAIL', field: 'form_id' },
    { name: 'form id with surrounding spaces', input: { ...VALID_ASSIGN, form_id: ` ${VALID_FORM_ID} ` }, expected: 'FAIL', field: 'form_id' },

    { name: 'event id missing', input: { form_id: VALID_FORM_ID }, expected: 'FAIL', field: 'event_id' },
    { name: 'event id past the column limit', input: { ...VALID_ASSIGN, event_id: EVENT_ID_MAX + 1 }, expected: 'FAIL', field: 'event_id' },
    { name: 'event id zero', input: { ...VALID_ASSIGN, event_id: 0 }, expected: 'FAIL', field: 'event_id', message: 'Event is required' },
    { name: 'event id negative', input: { ...VALID_ASSIGN, event_id: -1 }, expected: 'FAIL', field: 'event_id', message: 'Event is required' },
    { name: 'event id with a fraction', input: { ...VALID_ASSIGN, event_id: 1.5 }, expected: 'FAIL', field: 'event_id' },
    { name: 'event id as text', input: { ...VALID_ASSIGN, event_id: '5' }, expected: 'FAIL', field: 'event_id' },
    { name: 'event id as a list of one', input: { ...VALID_ASSIGN, event_id: [5] }, expected: 'FAIL', field: 'event_id' },
  ];

  describe('evaluation site · POST actions — input validation', () => {
    const ctx = useEvaluationApp();

    describe(CREATE_ENDPOINT.title, () => {
      describe('body', () => describeBodyTable(ctx, CREATE_ENDPOINT, createFixtures));
    });

    describe(ASSIGN_ENDPOINT.title, () => {
      describe('body', () => describeBodyTable(ctx, ASSIGN_ENDPOINT, assignFixtures));
    });
  });
}

/* ── security ────────────────────────────────────────────────────────────── */
{
  /**
   * Evaluation POST actions — security, per field class:
   *   title            short label shown to volunteers: SQLi, special-char series, control
   *                    chars, XSS FAIL
   *   description      free text: control characters FAIL, line breaks stay
   *   form_id          a uuid, the only form this table's ids take: every hostile string FAILs
   *   event_id         a number: every hostile string FAILs
   * plus type confusion, mass assignment, prototype pollution, and what the real service
   * builds and refuses.
   */
  const typeConfusion = (valid: object, field: string, skip: (value: unknown) => boolean = () => false): LayerFixture[] =>
    OPERATOR_INJECTION_PAYLOADS.filter((p) => !skip(p.value)).map((p) => ({
      name: `${field} ← ${p.category}: ${p.label}`,
      input: { ...valid, [field]: p.value },
      expected: 'FAIL',
      field,
    }));

  const rejectHostile = (valid: object, field: string): LayerFixture[] =>
    HOSTILE_STRINGS.map((p) => ({
      name: `${field} ← ${p.category}: ${p.label}`,
      input: { ...valid, [field]: p.value },
      expected: 'FAIL',
      field,
    }));

  const createFixtures: LayerFixture[] = [
    ...[...SQL_INJECTION_PAYLOADS, ...specialCharacterSeries(), ...CONTROL_CHAR_PAYLOADS, ...XSS_PAYLOADS].map(
      (p): LayerFixture => ({
        name: `title ← ${p.category}: ${p.label}`,
        input: { ...VALID_CREATE, title: p.value },
        expected: 'FAIL',
        field: 'title',
      }),
    ),
    ...typeConfusion(VALID_CREATE, 'title'),
    // Control characters must not get through; a description can run over several lines,
    // so line breaks are the exception.
    ...CONTROL_CHAR_PAYLOADS.filter((p) => !(p.label === 'CRLF injection')).map((p): LayerFixture => ({
      name: `description ← ${p.category}: ${p.label}`,
      input: { ...VALID_CREATE, description: p.value },
      expected: 'FAIL',
      field: 'description',
    })),
    ...typeConfusion(VALID_CREATE, 'description'),

    ...MASS_ASSIGNMENT_KEYS.map((extra): LayerFixture => ({
      name: `mass assignment: ${Object.keys(extra).join(', ')}`,
      input: { ...VALID_CREATE, ...extra },
      expected: 'FAIL',
    })),
    // A new questionnaire opens empty and as a draft; only the builder changes that.
    { name: 'mass assignment: status', input: { ...VALID_CREATE, status: 'PUBLISHED' }, expected: 'FAIL' },
    { name: 'mass assignment: questions', input: { ...VALID_CREATE, questions: [] }, expected: 'FAIL' },
    { name: 'mass assignment: is_default', input: { ...VALID_CREATE, is_default: true }, expected: 'FAIL' },
    { name: 'mass assignment: header_typography', input: { ...VALID_CREATE, header_typography: {} }, expected: 'FAIL' },
    { name: 'mass assignment: evaluation_form_id', input: { ...VALID_CREATE, evaluation_form_id: VALID_FORM_ID }, expected: 'FAIL' },
  ];

  const assignFixtures: LayerFixture[] = [
    ...rejectHostile(VALID_ASSIGN, 'form_id'),
    { name: 'form_id ← uuid with SQL tail', input: { ...VALID_ASSIGN, form_id: `${VALID_FORM_ID}' OR '1'='1` }, expected: 'FAIL', field: 'form_id' },
    ...typeConfusion(VALID_ASSIGN, 'form_id'),

    ...rejectHostile(VALID_ASSIGN, 'event_id'),
    // A number is what this field wants, so that payload is not type confusion here.
    ...typeConfusion(VALID_ASSIGN, 'event_id', (value) => typeof value === 'number'),

    ...MASS_ASSIGNMENT_KEYS.map((extra): LayerFixture => ({
      name: `mass assignment: ${Object.keys(extra).join(', ')}`,
      input: { ...VALID_ASSIGN, ...extra },
      expected: 'FAIL',
    })),
    // The assigner is always the caller.
    { name: 'mass assignment: assigned_by_id', input: { ...VALID_ASSIGN, assigned_by_id: VALID_FORM_ID }, expected: 'FAIL' },
    { name: 'mass assignment: evaluation_assignment_id', input: { ...VALID_ASSIGN, evaluation_assignment_id: VALID_FORM_ID }, expected: 'FAIL' },
  ];

  describe('evaluation site · POST actions — security', () => {
    const ctx = useEvaluationApp();

    // The guards themselves are out of scope here, but which roles they are told to
    // admit is not: the portal keeps this area to directors, and so must the API.
    asCase('invalid', 'A role other than Director calls the evaluation routes').it('admits directors alone, with no route opening itself wider', () => {
      expect(Reflect.getMetadata(ROLES_KEY, EvaluationSiteController)).toEqual([RoleType.DIRECTOR]);
      const handlers = Object.getOwnPropertyNames(EvaluationSiteController.prototype).filter((name) => name !== 'constructor');
      expect(handlers.length).toBeGreaterThan(0);
      for (const name of handlers) {
        expect(Reflect.getMetadata(ROLES_KEY, (EvaluationSiteController.prototype as any)[name])).toBeUndefined();
      }
    });

    describe(CREATE_ENDPOINT.title, () => {
      describe('body', () => describeBodyTable(ctx, CREATE_ENDPOINT, createFixtures));
    });

    describe(ASSIGN_ENDPOINT.title, () => {
      describe('body', () => describeBodyTable(ctx, ASSIGN_ENDPOINT, assignFixtures));
    });

    describe.each(ENDPOINTS)('$title', (endpoint) => {
      asCase('invalid', 'Attacker adds a role_type field to the body', 'Rejected and reported as unrecognized_keys').it('mass assignment is reported as unrecognized_keys', async () => {
        const outcome = await runSchemaLayer(endpoint.schema, { ...endpoint.validBody, role_type: 'ADMIN' });
        expect(outcome.issues).toEqual(
          expect.arrayContaining([expect.objectContaining({ code: 'unrecognized_keys' })]),
        );
      });

      asCase('invalid', 'Attacker sends a __proto__ / constructor.prototype body', 'Request rejected (400); Object.prototype is not polluted').it.each(PROTOTYPE_POLLUTION_BODIES)('FAIL · prototype pollution: $label', async (p) => {
        const outcome = await runApiLayer(ctx.app, {
          method: 'post',
          path: endpoint.path,
          rawBody: withPollution(endpoint.validBody, p.value as string),
        });
        expect(outcome.verdict).toBe('FAIL');
        expectValidationEnvelope(outcome);
        expect(ctx.service[endpoint.handler]).not.toHaveBeenCalled();
        expect(({} as any).isAdmin).toBeUndefined();
      });

      asCase('invalid', 'Client sends malformed (truncated) JSON').it('answers a malformed JSON body in the safe envelope, without reaching the service', async () => {
        const outcome = await runApiLayer(ctx.app, { method: 'post', path: endpoint.path, rawBody: '{"title":' });
        expect(outcome.status).toBe(400);
        expectSafeErrorEnvelope(outcome);
        expect(ctx.service[endpoint.handler]).not.toHaveBeenCalled();
      });
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

      describe('assignForm', () => {

        asCase('invalid', 'Staff submits a request with an unknown questionnaire').it('refuses an unknown questionnaire, without assigning anything', async () => {
          const { service, repository } = build({ form: null });
          await expect(service.assignForm(VALID_ASSIGN, CALLER.sub)).rejects.toEqual(new NotFoundException('Questionnaire not found'));
          expect(repository.upsertAssignment).not.toHaveBeenCalled();
        });

        asCase('invalid', 'Staff submits a request with an unknown event').it('refuses an unknown event, without assigning anything', async () => {
          const { service, repository } = build({ eventExists: false });
          await expect(service.assignForm(VALID_ASSIGN, CALLER.sub)).rejects.toEqual(new NotFoundException('Event not found'));
          expect(repository.eventExists).toHaveBeenCalledWith(VALID_ASSIGN.event_id);
          expect(repository.upsertAssignment).not.toHaveBeenCalled();
        });
      });
    });
  });
}
