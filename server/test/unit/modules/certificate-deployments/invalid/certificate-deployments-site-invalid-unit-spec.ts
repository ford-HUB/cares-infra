import { asCase } from '../../../../config/test-case';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
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
  DEPLOYMENTS_PATH,
  VALID_DEPLOY,
  useDeploymentsApp,
  EVENT_ID_MAX,
  VALID_DEPLOY as VALID,
  VALID_TEMPLATE_ID,
  describeDeployTable,
  CALLER,
  STORED_DESIGN,
} from '../certificate-deployments-site-support';
import {
  CertificateDeploymentStatus,
  CertificateTemplateStatus,
  EventStatus,
  RoleType,
} from '../../../../../src/infastructures/prisma/common/client';
import { CertificateDeploymentsSiteService } from '../../../../../src/modules/certificate-deployments/services/certificate-deployments-site-service';
import { DeployCertificateSchema } from '../../../../../src/modules/certificate-deployments/validators/certificate-deployments-site-validator';
import {
  HOSTILE_STRINGS,
  MASS_ASSIGNMENT_KEYS,
  OPERATOR_INJECTION_PAYLOADS,
  PROTOTYPE_POLLUTION_BODIES,
} from '../../../../config/security-payloads';

/**
 * Certificate Module · Deploy Certificate — invalid inputs.
 *
 * Every case here is an intentionally wrong input. A case Passes when the system
 * refuses it exactly as stated — a rejection as expected is the correct result.
 * The valid cases for this unit live in ../valid/.
 */

/* ── error handling ──────────────────────────────────────────────────────── */
{
  /**
   * Deploy — error handling: unexpected service errors and a response the serializer
   * refuses are masked as a generic 500 with nothing leaked, and the service's deliberate
   * HttpExceptions keep their status and message through the envelope.
   */
  const DELIBERATE_ERRORS = [
    { title: '404 for an unknown template', error: new NotFoundException('Certificate template not found') },
    { title: '404 for an unknown event', error: new NotFoundException('Event not found') },
    { title: '400 for a template not published', error: new BadRequestException('Only a published template can be deployed to an event') },
    { title: '400 for a cancelled event', error: new BadRequestException('That event was cancelled — nothing can be deployed to it') },
    { title: '409 once sheets have gone out', error: new ConflictException('Volunteer Appreciation is already distributing for this event') },
  ];

  describe('certificate deployments site · deploy — error handling', () => {
    const ctx = useDeploymentsApp();

    describe(`POST ${DEPLOYMENTS_PATH}`, () => {
      const deploy = () => runApiLayer(ctx.app, { method: 'post', path: DEPLOYMENTS_PATH, body: VALID_DEPLOY });

      asCase('invalid', 'The service fails with an unexpected internal or database error').it('masks an unexpected service error as a 500 without leaking detail', async () => {
        ctx.service.deploy.mockRejectedValueOnce(new Error('syntax error at or near "OR"') as never);
        const outcome = await deploy();
        expect(outcome.status).toBe(500);
        expectSafeErrorEnvelope(outcome);
        expect(outcome.body).toEqual({ ok: false, message: 'Internal server error' });
      });

      asCase('invalid', 'The service returns data that breaks the response schema').it('masks a response the serializer refuses as a 500', async () => {
        ctx.service.deploy.mockResolvedValueOnce({ id: 1 } as never);
        const outcome = await deploy();
        expect(outcome.status).toBe(500);
        expect(outcome.body).toEqual({ ok: false, message: 'Internal server error' });
      });

      asCase('invalid', 'The service refuses the request with a deliberate HTTP error (each kind)', 'Each deliberate error keeps its status and message in the { ok: false } envelope').it.each(DELIBERATE_ERRORS)('keeps $title', async ({ error }) => {
        ctx.service.deploy.mockRejectedValueOnce(error as never);
        const outcome = await deploy();
        expect(outcome.status).toBe(error.getStatus());
        expectSafeErrorEnvelope(outcome);
        expect(outcome.body.message).toBe(error.message);
      });
    });
  });
}

/* ── input validation ────────────────────────────────────────────────────── */
{
  /**
   * Deploy — input validation: the template id and the event id, each required, plus the
   * forms an event id legitimately arrives in.
   */
  const fixtures: LayerFixture[] = [

    { name: 'template id missing', input: { event_id: VALID.event_id }, expected: 'FAIL', field: 'certificate_template_id', message: 'Pick a certificate template' },
    { name: 'template id empty', input: { ...VALID, certificate_template_id: '' }, expected: 'FAIL', field: 'certificate_template_id' },
    { name: 'template id not a uuid', input: { ...VALID, certificate_template_id: 'template-1' }, expected: 'FAIL', field: 'certificate_template_id' },
    { name: 'template id missing a character', input: { ...VALID, certificate_template_id: VALID_TEMPLATE_ID.slice(0, -1) }, expected: 'FAIL', field: 'certificate_template_id' },
    { name: 'template id without hyphens', input: { ...VALID, certificate_template_id: VALID_TEMPLATE_ID.replace(/-/g, '') }, expected: 'FAIL', field: 'certificate_template_id' },
    { name: 'template reference instead of an id', input: { ...VALID, certificate_template_id: 'CT-2026-001' }, expected: 'FAIL', field: 'certificate_template_id' },

    { name: 'event id missing', input: { certificate_template_id: VALID_TEMPLATE_ID }, expected: 'FAIL', field: 'event_id' },
    { name: 'event id past the column limit', input: { ...VALID, event_id: EVENT_ID_MAX + 1 }, expected: 'FAIL', field: 'event_id' },
    { name: 'event id zero', input: { ...VALID, event_id: 0 }, expected: 'FAIL', field: 'event_id', message: 'Pick an event' },
    { name: 'event id negative', input: { ...VALID, event_id: -1 }, expected: 'FAIL', field: 'event_id', message: 'Pick an event' },
    { name: 'event id with a fraction', input: { ...VALID, event_id: 1.5 }, expected: 'FAIL', field: 'event_id' },
    { name: 'event id empty text', input: { ...VALID, event_id: '' }, expected: 'FAIL', field: 'event_id' },
    { name: 'event id as words', input: { ...VALID, event_id: 'five' }, expected: 'FAIL', field: 'event_id' },
    { name: 'event id as a hex literal', input: { ...VALID, event_id: '0x10' }, expected: 'FAIL', field: 'event_id' },
    { name: 'event id in exponent form', input: { ...VALID, event_id: '1e2' }, expected: 'FAIL', field: 'event_id' },
    { name: 'event id as a list of one', input: { ...VALID, event_id: [5] }, expected: 'FAIL', field: 'event_id' },
  ];

  describe('certificate deployments site · deploy — input validation', () => {
    const ctx = useDeploymentsApp();

    describe(`POST ${DEPLOYMENTS_PATH}`, () => {
      describeDeployTable(ctx, fixtures);
    });
  });
}

/* ── security ────────────────────────────────────────────────────────────── */
{
  /**
   * Deploy — security: both fields are constrained ids, so every hostile string FAILs,
   * plus type confusion, mass assignment, prototype pollution, and the rules in the real
   * service that decide what may be deployed and what a deployment freezes.
   */
  const fixtures: LayerFixture[] = [
    ...HOSTILE_STRINGS.map((p): LayerFixture => ({
      name: `certificate_template_id ← ${p.category}: ${p.label}`,
      input: { ...VALID, certificate_template_id: p.value },
      expected: 'FAIL',
      field: 'certificate_template_id',
    })),
    { name: 'certificate_template_id ← uuid with SQL tail', input: { ...VALID, certificate_template_id: `${VALID_TEMPLATE_ID}' OR '1'='1` }, expected: 'FAIL', field: 'certificate_template_id' },
    ...OPERATOR_INJECTION_PAYLOADS.map((p): LayerFixture => ({
      name: `certificate_template_id ← ${p.category}: ${p.label}`,
      input: { ...VALID, certificate_template_id: p.value },
      expected: 'FAIL',
      field: 'certificate_template_id',
    })),

    ...HOSTILE_STRINGS.map((p): LayerFixture => ({
      name: `event_id ← ${p.category}: ${p.label}`,
      input: { ...VALID, event_id: p.value },
      expected: 'FAIL',
      field: 'event_id',
    })),
    { name: 'event_id ← id with SQL tail', input: { ...VALID, event_id: '5 OR 1=1' }, expected: 'FAIL', field: 'event_id' },
    // A number is what this field wants, so that payload is not type confusion here.
    ...OPERATOR_INJECTION_PAYLOADS.filter((p) => typeof p.value !== 'number').map((p): LayerFixture => ({
      name: `event_id ← ${p.category}: ${p.label}`,
      input: { ...VALID, event_id: p.value },
      expected: 'FAIL',
      field: 'event_id',
    })),

    ...MASS_ASSIGNMENT_KEYS.map((extra): LayerFixture => ({
      name: `mass assignment: ${Object.keys(extra).join(', ')}`,
      input: { ...VALID, ...extra },
      expected: 'FAIL',
    })),
    // Everything on a deployment is read from the template and the event, never supplied.
    { name: 'mass assignment: status', input: { ...VALID, status: 'completed' }, expected: 'FAIL' },
    { name: 'mass assignment: design', input: { ...VALID, design: {} }, expected: 'FAIL' },
    { name: 'mass assignment: template_name', input: { ...VALID, template_name: 'Overwritten' }, expected: 'FAIL' },
    { name: 'mass assignment: participants', input: { ...VALID, participants: 9999 }, expected: 'FAIL' },
    { name: 'mass assignment: distributed', input: { ...VALID, distributed: 9999 }, expected: 'FAIL' },
    { name: 'mass assignment: reference', input: { ...VALID, reference: 'DC-2026-999' }, expected: 'FAIL' },
    { name: 'mass assignment: deployed_by', input: { ...VALID, deployed_by: 'The Director' }, expected: 'FAIL' },
  ];

  describe('certificate deployments site · deploy — security', () => {
    const ctx = useDeploymentsApp();

    describe(`POST ${DEPLOYMENTS_PATH}`, () => {
      describeDeployTable(ctx, fixtures);

      asCase('invalid', 'Attacker adds a role_type field to the body', 'Rejected and reported as unrecognized_keys').it('mass assignment is reported as unrecognized_keys', async () => {
        const outcome = await runSchemaLayer(DeployCertificateSchema, { ...VALID, status: 'completed' });
        expect(outcome.issues).toEqual(
          expect.arrayContaining([expect.objectContaining({ code: 'unrecognized_keys' })]),
        );
      });

      asCase('invalid', 'Attacker sends a __proto__ / constructor.prototype body', 'Request rejected (400); Object.prototype is not polluted').it.each(PROTOTYPE_POLLUTION_BODIES)('FAIL · prototype pollution: $label', async (p) => {
        const outcome = await runApiLayer(ctx.app, {
          method: 'post',
          path: DEPLOYMENTS_PATH,
          rawBody: withPollution(VALID, p.value as string),
        });
        expect(outcome.verdict).toBe('FAIL');
        expectValidationEnvelope(outcome);
        expect(ctx.service.deploy).not.toHaveBeenCalled();
        expect(({} as any).isAdmin).toBeUndefined();
      });

      asCase('invalid', 'Client sends malformed (truncated) JSON').it('answers a malformed JSON body in the safe envelope, without reaching the service', async () => {
        const outcome = await runApiLayer(ctx.app, { method: 'post', path: DEPLOYMENTS_PATH, rawBody: '{"event_id":' });
        expect(outcome.status).toBe(400);
        expectSafeErrorEnvelope(outcome);
        expect(ctx.service.deploy).not.toHaveBeenCalled();
      });
    });

    // The controller's service is mocked above; what may be deployed lives in the real one.
    describe('deploy (real service)', () => {
      const PAST = new Date('2026-10-30T05:00:00.000Z');

      const TEMPLATE = {
        certificate_template_id: VALID_TEMPLATE_ID,
        reference: 'CT-2026-001',
        name: 'Volunteer Appreciation',
        category: 'APPRECIATION',
        orientation: 'LANDSCAPE',
        status: CertificateTemplateStatus.PUBLISHED,
        design: STORED_DESIGN,
        signatories: [
          {
            certificate_template_signatory_id: 'signatory-id',
            coordinator_user_id: 'coordinator-user-id',
            name: 'Ada Lovelace',
            title: 'Program Director',
            department: 'UCLM CARES',
            signature_token: '{{signature-image}}',
            coordinator: { accounts: [{ signature_url: 'private/signature.png' }] },
          },
        ],
      };

      const EVENT = {
        event_id: VALID.event_id,
        title: 'Coastal Clean-up Drive',
        location: 'Brgy. Lahug, Cebu City',
        event_started: new Date('2026-10-30T01:00:00.000Z'),
        event_ended: PAST,
        participants: 40,
        status: EventStatus.Completed,
      };

      /** What the row looks like once saved, so the real mapper runs over the real copy. */
      const savedRow = (reference: string, persisted: any, id = 'new-deployment-id') => ({
        certificate_deployment_id: id,
        reference,
        certificate_template_id: persisted.certificateTemplateId,
        template_name: persisted.templateName,
        category: persisted.category,
        orientation: persisted.orientation,
        design: persisted.design,
        event_id: persisted.eventId,
        event_name: persisted.eventName,
        event_venue: persisted.eventVenue,
        event_date: persisted.eventDate,
        status: persisted.status,
        participants: persisted.participants,
        distributed: 0,
        claimed: 0,
        createdAt: new Date('2026-10-30T08:00:00.000Z'),
        deployed_by_name: persisted.deployedByName,
      });

      const build = ({ template = TEMPLATE as object | null, event = EVENT as object | null, existing = null as object | null, highest = 0 } = {}) => {
        const repository = autoMock<any>({
          findByTemplateAndEvent: jest.fn().mockResolvedValue(existing),
          highestReferenceSequence: jest.fn().mockResolvedValue(highest),
          create: jest.fn(async (reference: string, persisted: object) => savedRow(reference, persisted)),
          recut: jest.fn(async (id: string, persisted: object) => savedRow('DC-2026-001', persisted, id)),
        });
        const templates = autoMock<any>({
          findById: jest.fn().mockResolvedValue(template),
          findCoordinators: jest.fn().mockResolvedValue([
            { user_id: CALLER.sub, firstname: 'Grace', lastname: 'Hopper', role: { type: RoleType.DIRECTOR } },
          ]),
        });
        const events = autoMock<any>({ findById: jest.fn().mockResolvedValue(event) });
        const audit = autoMock<any>();
        const service = new CertificateDeploymentsSiteService(repository, templates, events, audit);
        return { service, repository, templates, audit };
      };

      const deploy = (service: CertificateDeploymentsSiteService, context: object = {}) =>
        service.deploy(CALLER as never, VALID as never, context);

      const expectNothingSaved = (repository: any) => {
        expect(repository.create).not.toHaveBeenCalled();
        expect(repository.recut).not.toHaveBeenCalled();
      };

      asCase('invalid', 'Staff deploys a template that is still a draft or is archived').it.each([CertificateTemplateStatus.DRAFT, CertificateTemplateStatus.ARCHIVED])(
        'refuses a %s template, without saving anything',
        async (status) => {
          const { service, repository } = build({ template: { ...TEMPLATE, status } });
          await expect(deploy(service)).rejects.toEqual(
            new BadRequestException('Only a published template can be deployed to an event'),
          );
          expectNothingSaved(repository);
        },
      );

      asCase('invalid', 'Staff submits a request with an unknown template').it('refuses an unknown template, without saving anything', async () => {
        const { service, repository } = build({ template: null });
        await expect(deploy(service)).rejects.toEqual(new NotFoundException('Certificate template not found'));
        expectNothingSaved(repository);
      });

      asCase('invalid', 'Staff submits a request with an unknown event').it('refuses an unknown event, without saving anything', async () => {
        const { service, repository } = build({ event: null });
        await expect(deploy(service)).rejects.toEqual(new NotFoundException('Event not found'));
        expectNothingSaved(repository);
      });

      asCase('invalid', 'Staff submits a request with a cancelled event').it('refuses a cancelled event, without saving anything', async () => {
        const { service, repository } = build({ event: { ...EVENT, status: EventStatus.Cancelled } });
        await expect(deploy(service)).rejects.toEqual(
          new BadRequestException('That event was cancelled — nothing can be deployed to it'),
        );
        expectNothingSaved(repository);
      });

      asCase('invalid', 'Staff re-deploys a certificate that has already been handed out').it('refuses to change a deployment that has already handed sheets out', async () => {
        const existing = { certificate_deployment_id: 'existing-id', distributed: 1, status: CertificateDeploymentStatus.DISTRIBUTING };
        const { service, repository } = build({ existing });
        await expect(deploy(service)).rejects.toBeInstanceOf(ConflictException);
        expectNothingSaved(repository);
      });
    });
  });
}
