import { asCase } from '../../../../config/test-case';
import {
  CERTIFICATE_CATEGORIES,
  CERTIFICATE_ORIENTATIONS,
  CertificateTemplateResponseSchema,
  CreateCertificateTemplateSchema,
  awardTextIssue,
} from '../../../../../src/modules/certificate-templates/validators/certificate-templates-site-validator';
import { LayerFixture, runApiLayer, autoMock } from '../../../../config/layer-harness';
import {
  TEMPLATES_PATH,
  TEMPLATE_RESPONSE,
  VALID_TEMPLATE as VALID,
  describeTemplateTable,
  useCertificateTemplatesApp,
  CALLER,
} from '../certificate-templates-site-support';
import { RoleType } from '../../../../../src/infastructures/prisma/common/client';
import { CertificateTemplatesSiteService } from '../../../../../src/modules/certificate-templates/services/certificate-templates-site-service';
import {
  CONTROL_CHAR_PAYLOADS,
  PATH_TRAVERSAL_PAYLOADS,
  SQL_INJECTION_PAYLOADS,
  UNICODE_CONFUSABLE_PAYLOADS,
  XSS_PAYLOADS,
  specialCharacterSeries,
} from '../../../../config/security-payloads';

/**
 * Certificate Module · Certificate Template — valid inputs.
 *
 * Every case here is a legitimate input the system must accept.
 * The invalid cases for this unit live in ../invalid/.
 */

/* ── input validation ────────────────────────────────────────────────────── */
{
  /**
   * New Template — input validation: required, empty and length rules on the name and
   * description, the category and orientation lists, plus legitimate inputs that must pass.
   */
  const textRules = (field: string, min: number, max: number): LayerFixture[] => [
    { name: `${field} at min`, input: { ...VALID, [field]: 'a'.repeat(min) }, expected: 'PASS' },
    { name: `${field} at max`, input: { ...VALID, [field]: 'a'.repeat(max) }, expected: 'PASS' },
    { name: `${field} at max once trimmed`, input: { ...VALID, [field]: `  ${'a'.repeat(max)}  ` }, expected: 'PASS' },
  ];

  const fixtures: LayerFixture[] = [
    { name: 'valid body', input: VALID, expected: 'PASS' },

    ...textRules('name', 3, 80),
    { name: 'name with an apostrophe', input: { ...VALID, name: "Volunteers' Appreciation" }, expected: 'PASS' },
    { name: 'name with a hyphen', input: { ...VALID, name: 'Year-End Recognition' }, expected: 'PASS' },
    { name: 'name with a colon and brackets', input: { ...VALID, name: 'Recognition: Batch 2 (2026)' }, expected: 'PASS' },
    { name: 'name with an ampersand', input: { ...VALID, name: 'Health & Wellness Award' }, expected: 'PASS' },
    { name: 'name with accents', input: { ...VALID, name: 'Gawad Señor' }, expected: 'PASS' },

    ...textRules('description', 10, 160),
    { name: 'description with punctuation', input: { ...VALID, description: "Given to donors; it's signed by the director." }, expected: 'PASS' },
    { name: 'description with line breaks', input: { ...VALID, description: 'Line one\nLine two\nLine three' }, expected: 'PASS' },
    { name: 'description with accents and emoji', input: { ...VALID, description: 'Salamat, Señora! 🙏 For our donors.' }, expected: 'PASS' },
    ...CERTIFICATE_CATEGORIES.map((category): LayerFixture => ({
      name: `category ${category}`,
      input: { ...VALID, category },
      expected: 'PASS',
    })),

    { name: 'orientation left out', input: { ...VALID, orientation: undefined }, expected: 'PASS' },
    ...CERTIFICATE_ORIENTATIONS.map((orientation): LayerFixture => ({
      name: `orientation ${orientation}`,
      input: { ...VALID, orientation },
      expected: 'PASS',
    })),
  ];

  describe('certificate templates site · new template — input validation', () => {
    const ctx = useCertificateTemplatesApp();

    describe(`POST ${TEMPLATES_PATH}`, () => {
      describeTemplateTable(ctx, fixtures);

      asCase('valid', 'Staff submits a valid request').it('wraps the created template in the success envelope', async () => {
        const outcome = await runApiLayer(ctx.app, { method: 'post', path: TEMPLATES_PATH, body: VALID });
        expect(outcome.status).toBe(201);
        expect(outcome.body).toEqual({ ok: true, message: 'Certificate template created', data: TEMPLATE_RESPONSE });
      });
    });
  });
}

/* ── normalization ───────────────────────────────────────────────────────── */
{
  /**
   * New Template — normalisation: the schema trims the text and defaults the orientation,
   * the service receives that with the caller and where the request came from, and only
   * the response schema's fields leave the server.
   */
  describe('certificate templates site · new template — normalisation', () => {
    const ctx = useCertificateTemplatesApp();

    const send = (body: object, headers?: Record<string, string>) =>
      runApiLayer(ctx.app, { method: 'post', path: TEMPLATES_PATH, body, headers });

    describe(`POST ${TEMPLATES_PATH}`, () => {
      asCase('valid', 'Staff submits a valid request').it('passes the caller, the body and the request context to the service', async () => {
        await send(VALID, { 'User-Agent': 'portal-browser' });
        expect(ctx.service.createTemplate).toHaveBeenCalledTimes(1);
        expect(ctx.service.createTemplate).toHaveBeenCalledWith(
          CALLER,
          VALID,
          expect.objectContaining({ userAgent: 'portal-browser', ipAddress: expect.any(String) }),
        );
      });

      asCase('valid', 'Staff enters the name with surrounding spaces').it('trims the name and the description', async () => {
        await send({ ...VALID, name: `  ${VALID.name}  `, description: `  ${VALID.description}\n` });
        expect(ctx.service.createTemplate.mock.calls[0][1]).toEqual(VALID);
      });

      asCase('valid', 'Staff enters a description spanning several lines').it('keeps line breaks inside the description', async () => {
        const description = 'Line one\n\nLine three';
        await send({ ...VALID, description });
        expect(ctx.service.createTemplate.mock.calls[0][1].description).toBe(description);
      });

      asCase('valid', 'Staff leaves the optional fields out').it('defaults the orientation to landscape', async () => {
        const { orientation: _orientation, ...withoutOrientation } = VALID;
        await send({ ...withoutOrientation });
        expect(ctx.service.createTemplate.mock.calls[0][1].orientation).toBe('landscape');
      });

      asCase('valid', 'Staff chooses portrait orientation').it('keeps the portrait orientation when it is chosen', async () => {
        await send({ ...VALID, orientation: 'portrait' });
        expect(ctx.service.createTemplate.mock.calls[0][1].orientation).toBe('portrait');
      });

      asCase('valid', 'The service returns internal fields along with the result').it('keeps fields outside the response schema off the wire', async () => {
        ctx.service.createTemplate.mockResolvedValueOnce({
          ...TEMPLATE_RESPONSE,
          updated_by_user_id: CALLER.sub,
          signatories: [{ ...TEMPLATE_RESPONSE.signatories[0], signature_url: 'private/signature.png' }],
        } as never);
        const outcome = await send(VALID);
        expect(outcome.status).toBe(201);
        expect(outcome.body.data).toEqual(TEMPLATE_RESPONSE);
      });
    });
  });
}

/* ── security ────────────────────────────────────────────────────────────── */
{
  /** Padded past the minimum, so a payload is judged on its content and not on its length. */
  const asDescription = (value: unknown) => `Used for ${value as string}`;

  const fixtures: LayerFixture[] = [

    // Free text: stored as data through Prisma and escaped by the portal when rendered.
    ...[...SQL_INJECTION_PAYLOADS, ...specialCharacterSeries(), ...UNICODE_CONFUSABLE_PAYLOADS, ...XSS_PAYLOADS, ...PATH_TRAVERSAL_PAYLOADS].map(
      (p): LayerFixture => ({
        name: `description ← ${p.category}: ${p.label}`,
        input: { ...VALID, description: asDescription(p.value) },
        expected: 'PASS',
      }),
    ),
    // The field trims, so it is treated as sanitised: control characters must not get
    // through. A description can run over several lines, so line breaks are the exception.
    ...CONTROL_CHAR_PAYLOADS.filter((p) => p.label === 'CRLF injection').map((p): LayerFixture => ({
      name: `description ← ${p.category}: ${p.label}`,
      input: { ...VALID, description: asDescription(p.value) },
      expected: 'PASS',
      field: 'description',
    })),
  ];

  describe('certificate templates site · new template — security', () => {
    const ctx = useCertificateTemplatesApp();

    describe(`POST ${TEMPLATES_PATH}`, () => {
      describeTemplateTable(ctx, fixtures);
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

      asCase('valid', 'Staff creates a new certificate template').it('always starts as a draft', async () => {
        const { service, repository } = build();
        await create(service);
        expect(repository.create.mock.calls[0][1].status).toBe('DRAFT');
      });

      asCase('valid', 'Staff creates a new certificate template').it('is signed by the account creating it, read from the directory', async () => {
        const { service, repository } = build();
        await create(service);
        expect(repository.findCoordinators).toHaveBeenCalledWith([CALLER.sub]);
        expect(repository.create.mock.calls[0][2]).toEqual([
          expect.objectContaining({
            coordinatorUserId: CALLER.sub,
            name: 'Ada Lovelace',
            signatureToken: '{{signature-image}}',
            position: 0,
          }),
        ]);
      });

      asCase('valid', 'Staff creates a new certificate template').it('issues the next reference for the year', async () => {
        const { service, repository } = build([AUTHOR], 13);
        await create(service);
        expect(repository.create.mock.calls[0][0]).toBe(`CT-${new Date().getFullYear()}-014`);
      });

      asCase('valid', 'Staff creates a new certificate template').it('writes who created it and from where to the audit trail', async () => {
        const { service, audit } = build();
        await create(service, VALID, { ipAddress: '203.0.113.10', userAgent: 'portal-browser' });
        expect(audit.record).toHaveBeenCalledTimes(1);
        expect(audit.record).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'certificate-template.created',
            actor: CALLER,
            ipAddress: '203.0.113.10',
            userAgent: 'portal-browser',
          }),
        );
      });

      asCase('valid', 'Staff creates a template in each certificate category', 'Every category passes the rules it will be saved and served under').it.each(CERTIFICATE_CATEGORIES.map((category) => ({ category })))(
        'a new $category template passes the rules it will be saved and served under',
        async ({ category }) => {
          const { service, repository } = build();
          const dto = await create(service, { ...VALID, category });
          expect(CertificateTemplateResponseSchema.safeParse(dto).success).toBe(true);
          expect(awardTextIssue(repository.create.mock.calls[0][1].design.body)).toBeNull();
        },
      );

      // The name becomes the design's title, which the response schema checks for broken
      // placeholders. A name the request accepts but the response refuses saves the row and
      // then answers 500, so every name that gets through must come back out.
      asCase('valid', 'Staff enters template names at the length limits or with unusual placeholders').it.each([
        { title: 'at the minimum length', name: 'abc' },
        { title: 'at the maximum length', name: 'a'.repeat(80) },
        { title: 'with an unknown placeholder', name: 'Award {{unknown}}' },
        { title: 'with a half-typed placeholder', name: 'Award {date}' },
      ])('a name $title is either refused or served back', async ({ name }) => {
        const parsed = CreateCertificateTemplateSchema.safeParse({ ...VALID, name });
        if (!parsed.success) return;

        const { service } = build();
        const dto = await create(service, parsed.data);
        expect(CertificateTemplateResponseSchema.safeParse(dto).success).toBe(true);
      });
    });
  });
}
