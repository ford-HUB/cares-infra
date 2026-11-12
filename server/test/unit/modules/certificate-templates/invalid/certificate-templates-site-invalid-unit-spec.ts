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
  TEMPLATES_PATH,
  VALID_TEMPLATE,
  useCertificateTemplatesApp,
  VALID_TEMPLATE as VALID,
  describeTemplateTable,
  CALLER,
} from '../certificate-templates-site-support';
import { CreateCertificateTemplateSchema } from '../../../../../src/modules/certificate-templates/validators/certificate-templates-site-validator';
import { RoleType } from '../../../../../src/infastructures/prisma/common/client';
import { CertificateTemplatesSiteService } from '../../../../../src/modules/certificate-templates/services/certificate-templates-site-service';
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
 * Certificate Module · Certificate Template — invalid inputs.
 *
 * Every case here is an intentionally wrong input. A case Passes when the system
 * refuses it exactly as stated — a rejection as expected is the correct result.
 * The valid cases for this unit live in ../valid/.
 */

/* ── error handling ──────────────────────────────────────────────────────── */
{
  /**
   * New Template — error handling: unexpected service errors and a response the serializer
   * refuses are masked as a generic 500 with nothing leaked, and the service's deliberate
   * HttpExceptions keep their status and message through the envelope.
   */
  describe('certificate templates site · new template — error handling', () => {
    const ctx = useCertificateTemplatesApp();

    describe(`POST ${TEMPLATES_PATH}`, () => {
      const create = () => runApiLayer(ctx.app, { method: 'post', path: TEMPLATES_PATH, body: VALID_TEMPLATE });

      asCase('invalid', 'The service fails with an unexpected internal or database error').it('masks an unexpected service error as a 500 without leaking detail', async () => {
        ctx.service.createTemplate.mockRejectedValueOnce(new Error('syntax error at or near "OR"') as never);
        const outcome = await create();
        expect(outcome.status).toBe(500);
        expectSafeErrorEnvelope(outcome);
        expect(outcome.body).toEqual({ ok: false, message: 'Internal server error' });
      });

      asCase('invalid', 'The service returns data that breaks the response schema').it('masks a response the serializer refuses as a 500', async () => {
        ctx.service.createTemplate.mockResolvedValueOnce({ id: 1 } as never);
        const outcome = await create();
        expect(outcome.status).toBe(500);
        expect(outcome.body).toEqual({ ok: false, message: 'Internal server error' });
      });

      asCase('invalid', 'Request made when the signed-in account no longer exists', 'Request fails with 404; status and message are kept in the { ok: false } envelope').it('keeps the 404 when the signed-in account no longer exists', async () => {
        ctx.service.createTemplate.mockRejectedValueOnce(new NotFoundException('The signed-in account no longer exists') as never);
        const outcome = await create();
        expect(outcome.status).toBe(404);
        expectSafeErrorEnvelope(outcome);
        expect(outcome.body.message).toBe('The signed-in account no longer exists');
      });
    });
  });
}

/* ── input validation ────────────────────────────────────────────────────── */
{
  /**
   * New Template — input validation: required, empty and length rules on the name and
   * description, the category and orientation lists, plus legitimate inputs that must pass.
   */
  const textRules = (field: string, min: number, max: number): LayerFixture[] => [
    { name: `${field} missing`, input: { ...VALID, [field]: undefined }, expected: 'FAIL', field },
    { name: `${field} empty`, input: { ...VALID, [field]: '' }, expected: 'FAIL', field },
    { name: `${field} whitespace-only`, input: { ...VALID, [field]: ' '.repeat(max) }, expected: 'FAIL', field },
    { name: `${field} under min`, input: { ...VALID, [field]: 'a'.repeat(min - 1) }, expected: 'FAIL', field },
    { name: `${field} under min once trimmed`, input: { ...VALID, [field]: `  ${'a'.repeat(min - 1)}  ` }, expected: 'FAIL', field },
    { name: `${field} over max`, input: { ...VALID, [field]: 'a'.repeat(max + 1) }, expected: 'FAIL', field },
  ];

  const fixtures: LayerFixture[] = [

    ...textRules('name', 3, 80),

    ...textRules('description', 10, 160),

    { name: 'category missing', input: { ...VALID, category: undefined }, expected: 'FAIL', field: 'category' },
    { name: 'category not on the list', input: { ...VALID, category: 'attendance' }, expected: 'FAIL', field: 'category' },
    { name: 'category in the wrong case', input: { ...VALID, category: 'APPRECIATION' }, expected: 'FAIL', field: 'category' },
    { name: 'category empty', input: { ...VALID, category: '' }, expected: 'FAIL', field: 'category' },
    { name: 'orientation not on the list', input: { ...VALID, orientation: 'square' }, expected: 'FAIL', field: 'orientation' },
    { name: 'orientation in the wrong case', input: { ...VALID, orientation: 'LANDSCAPE' }, expected: 'FAIL', field: 'orientation' },
    { name: 'orientation empty', input: { ...VALID, orientation: '' }, expected: 'FAIL', field: 'orientation' },
  ];

  describe('certificate templates site · new template — input validation', () => {
    const ctx = useCertificateTemplatesApp();

    describe(`POST ${TEMPLATES_PATH}`, () => {
      describeTemplateTable(ctx, fixtures);
    });
  });
}

/* ── security ────────────────────────────────────────────────────────────── */
{
  /**
   * New Template — security, per field class:
   *   category, orientation  constrained: every hostile string FAILs
   *   name                   short label, printed on the certificate: SQLi, special-char
   *                          series, control chars, XSS FAIL
   *   description            free text, trimmed: control characters FAIL, line breaks stay
   * plus type confusion, mass assignment, prototype pollution, and what the real service
   * builds, since creation takes four fields and writes the rest itself.
   */
  const typeConfusion = (field: string): LayerFixture[] =>
    OPERATOR_INJECTION_PAYLOADS.map((p) => ({
      name: `${field} ← ${p.category}: ${p.label}`,
      input: { ...VALID, [field]: p.value },
      expected: 'FAIL',
      field,
    }));

  const rejectHostile = (field: string): LayerFixture[] =>
    HOSTILE_STRINGS.map((p) => ({
      name: `${field} ← ${p.category}: ${p.label}`,
      input: { ...VALID, [field]: p.value },
      expected: 'FAIL',
      field,
    }));

  /** Padded past the minimum, so a payload is judged on its content and not on its length. */
  const asDescription = (value: unknown) => `Used for ${value as string}`;

  const fixtures: LayerFixture[] = [
    ...rejectHostile('category'),
    ...typeConfusion('category'),
    ...rejectHostile('orientation'),
    ...typeConfusion('orientation'),

    ...[...SQL_INJECTION_PAYLOADS, ...specialCharacterSeries(), ...CONTROL_CHAR_PAYLOADS, ...XSS_PAYLOADS].map(
      (p): LayerFixture => ({
        name: `name ← ${p.category}: ${p.label}`,
        input: { ...VALID, name: p.value },
        expected: 'FAIL',
        field: 'name',
      }),
    ),
    ...typeConfusion('name'),
    // The field trims, so it is treated as sanitised: control characters must not get
    // through. A description can run over several lines, so line breaks are the exception.
    ...CONTROL_CHAR_PAYLOADS.filter((p) => !(p.label === 'CRLF injection')).map((p): LayerFixture => ({
      name: `description ← ${p.category}: ${p.label}`,
      input: { ...VALID, description: asDescription(p.value) },
      expected: 'FAIL',
      field: 'description',
    })),
    ...typeConfusion('description'),

    ...MASS_ASSIGNMENT_KEYS.map((extra): LayerFixture => ({
      name: `mass assignment: ${Object.keys(extra).join(', ')}`,
      input: { ...VALID, ...extra },
      expected: 'FAIL',
    })),
    // A template starts as a draft from the server's defaults, signed by its creator; the
    // customizer is the one screen that changes any of this.
    { name: 'mass assignment: status', input: { ...VALID, status: 'published' }, expected: 'FAIL' },
    { name: 'mass assignment: design', input: { ...VALID, design: {} }, expected: 'FAIL' },
    { name: 'mass assignment: signatories', input: { ...VALID, signatories: [{ coordinator_id: CALLER.sub }] }, expected: 'FAIL' },
    { name: 'mass assignment: reference', input: { ...VALID, reference: 'CT-2026-999' }, expected: 'FAIL' },
    { name: 'mass assignment: issued', input: { ...VALID, issued: 999 }, expected: 'FAIL' },
    { name: 'mass assignment: updated_by', input: { ...VALID, updated_by: 'The Director' }, expected: 'FAIL' },
  ];

  describe('certificate templates site · new template — security', () => {
    const ctx = useCertificateTemplatesApp();

    describe(`POST ${TEMPLATES_PATH}`, () => {
      describeTemplateTable(ctx, fixtures);

      asCase('invalid', 'Attacker adds a role_type field to the body', 'Rejected and reported as unrecognized_keys').it('mass assignment is reported as unrecognized_keys', async () => {
        const outcome = await runSchemaLayer(CreateCertificateTemplateSchema, { ...VALID, status: 'published' });
        expect(outcome.issues).toEqual(
          expect.arrayContaining([expect.objectContaining({ code: 'unrecognized_keys' })]),
        );
      });

      asCase('invalid', 'Attacker sends a __proto__ / constructor.prototype body', 'Request rejected (400); Object.prototype is not polluted').it.each(PROTOTYPE_POLLUTION_BODIES)('FAIL · prototype pollution: $label', async (p) => {
        const outcome = await runApiLayer(ctx.app, {
          method: 'post',
          path: TEMPLATES_PATH,
          rawBody: withPollution(VALID, p.value as string),
        });
        expect(outcome.verdict).toBe('FAIL');
        expectValidationEnvelope(outcome);
        expect(ctx.service.createTemplate).not.toHaveBeenCalled();
        expect(({} as any).isAdmin).toBeUndefined();
      });

      asCase('invalid', 'Client sends malformed (truncated) JSON').it('answers a malformed JSON body in the safe envelope, without reaching the service', async () => {
        const outcome = await runApiLayer(ctx.app, { method: 'post', path: TEMPLATES_PATH, rawBody: '{"name":' });
        expect(outcome.status).toBe(400);
        expectSafeErrorEnvelope(outcome);
        expect(ctx.service.createTemplate).not.toHaveBeenCalled();
      });
    });

    // The controller's service is mocked above; what a new template is made of lives in the real one.
    describe('createTemplate (real service)', () => {
      const AUTHOR = {
        user_id: CALLER.sub,
        firstname: 'Ada',
        lastname: 'Lovelace',
        portal_department: null,
        role: { type: RoleType.DIRECTOR },
        accounts: [],
      };

      const build = (directory: object[] = [AUTHOR], highest = 0) => {
        const repository = autoMock<any>({
          findCoordinators: jest.fn().mockResolvedValue(directory),
          highestReferenceSequence: jest.fn().mockResolvedValue(highest),
          create: jest.fn(async (reference: string, details: any, signatories: any[]) => ({
            certificate_template_id: 'b3f1c2d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
            reference,
            name: details.name,
            description: details.description,
            category: details.category,
            status: details.status,
            orientation: details.orientation,
            design: details.design,
            issued: 0,
            deployed_events: 0,
            updatedAt: new Date('2026-10-30T08:00:00.000Z'),
            updated_by_name: details.updatedByName,
            signatories: signatories.map((signatory) => ({
              certificate_template_signatory_id: 'signatory-id',
              coordinator_user_id: signatory.coordinatorUserId,
              name: signatory.name,
              title: signatory.title,
              department: signatory.department,
              signature_token: signatory.signatureToken,
              coordinator: { accounts: [] },
            })),
          })),
        });
        const audit = autoMock<any>();
        const service = new CertificateTemplatesSiteService(repository, autoMock<any>(), audit);
        return { service, repository, audit };
      };

      const create = (service: CertificateTemplatesSiteService, body: object = VALID, context: object = {}) =>
        service.createTemplate(CALLER as never, body as never, context);

      asCase('invalid', 'Staff submits a request with an account that no longer exists').it('refuses an account that no longer exists, without creating anything', async () => {
        const { service, repository } = build([]);
        await expect(create(service)).rejects.toEqual(new NotFoundException('The signed-in account no longer exists'));
        expect(repository.create).not.toHaveBeenCalled();
      });
    });
  });
}
