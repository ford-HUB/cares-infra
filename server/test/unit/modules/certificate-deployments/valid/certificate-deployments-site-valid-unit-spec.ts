import { asCase } from '../../../../config/test-case';
import { LayerFixture, runApiLayer, autoMock } from '../../../../config/layer-harness';
import {
  DEPLOYMENTS_PATH,
  DEPLOYMENT_RESPONSE,
  EVENT_ID_MAX,
  VALID_DEPLOY as VALID,
  VALID_TEMPLATE_ID,
  describeDeployTable,
  useDeploymentsApp,
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
import { CertificateDeploymentResponseSchema } from '../../../../../src/modules/certificate-deployments/validators/certificate-deployments-site-validator';

/**
 * Certificate Module · Deploy Certificate — valid inputs.
 *
 * Every case here is a legitimate input the system must accept.
 * The invalid cases for this unit live in ../invalid/.
 */

/* ── input validation ────────────────────────────────────────────────────── */
{
  /**
   * Deploy — input validation: the template id and the event id, each required, plus the
   * forms an event id legitimately arrives in.
   */
  const fixtures: LayerFixture[] = [
    { name: 'valid body', input: VALID, expected: 'PASS' },
    { name: 'upper-case template id', input: { ...VALID, certificate_template_id: VALID_TEMPLATE_ID.toUpperCase() }, expected: 'PASS' },
    { name: 'event id as text', input: { ...VALID, event_id: '5' }, expected: 'PASS' },
    { name: 'event id at the smallest', input: { ...VALID, event_id: 1 }, expected: 'PASS' },
    { name: 'event id at the column limit', input: { ...VALID, event_id: EVENT_ID_MAX }, expected: 'PASS' },
  ];

  describe('certificate deployments site · deploy — input validation', () => {
    const ctx = useDeploymentsApp();

    describe(`POST ${DEPLOYMENTS_PATH}`, () => {
      describeDeployTable(ctx, fixtures);

      asCase('valid', 'Staff submits a valid request').it('wraps the deployment in the success envelope', async () => {
        const outcome = await runApiLayer(ctx.app, { method: 'post', path: DEPLOYMENTS_PATH, body: VALID });
        expect(outcome.status).toBe(201);
        expect(outcome.body).toEqual({ ok: true, message: 'Template deployed', data: DEPLOYMENT_RESPONSE });
      });
    });
  });
}

/* ── normalization ───────────────────────────────────────────────────────── */
{
  /**
   * Deploy — normalisation: the schema turns an event id sent as text into a number, the
   * service receives that with the caller and where the request came from, and only the
   * response schema's fields leave the server.
   */
  describe('certificate deployments site · deploy — normalisation', () => {
    const ctx = useDeploymentsApp();

    const send = (body: object, headers?: Record<string, string>) =>
      runApiLayer(ctx.app, { method: 'post', path: DEPLOYMENTS_PATH, body, headers });

    describe(`POST ${DEPLOYMENTS_PATH}`, () => {
      asCase('valid', 'Staff submits a valid request').it('passes the caller, the body and the request context to the service', async () => {
        await send(VALID, { 'User-Agent': 'portal-browser' });
        expect(ctx.service.deploy).toHaveBeenCalledTimes(1);
        expect(ctx.service.deploy).toHaveBeenCalledWith(
          CALLER,
          VALID,
          expect.objectContaining({ userAgent: 'portal-browser', ipAddress: expect.any(String) }),
        );
      });

      asCase('valid', 'Staff sends the event id as text').it('turns an event id sent as text into a number', async () => {
        await send({ ...VALID, event_id: String(VALID.event_id) });
        expect(ctx.service.deploy.mock.calls[0][1].event_id).toBe(VALID.event_id);
      });

      asCase('valid', 'The service returns internal fields along with the result').it('keeps fields outside the response schema off the wire', async () => {
        ctx.service.deploy.mockResolvedValueOnce({
          ...DEPLOYMENT_RESPONSE,
          deployed_by_user_id: CALLER.sub,
          design: {
            ...DEPLOYMENT_RESPONSE.design,
            signatories: [{ ...DEPLOYMENT_RESPONSE.design.signatories[0], signature_url: 'private/signature.png' }],
          },
        } as never);
        const outcome = await send(VALID);
        expect(outcome.status).toBe(201);
        expect(outcome.body.data).toEqual(DEPLOYMENT_RESPONSE);
      });
    });
  });
}

/* ── security ────────────────────────────────────────────────────────────── */
{
  describe('certificate deployments site · deploy — security', () => {
    // What may be deployed lives in the real service, built per case below.
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


      asCase('valid', 'Staff re-deploys a certificate nothing has been handed out from').it('re-cuts a deployment nothing has gone out from, keeping its status', async () => {
        const existing = { certificate_deployment_id: 'existing-id', distributed: 0, status: CertificateDeploymentStatus.PAUSED };
        const { service, repository, audit } = build({ existing });
        await deploy(service);
        expect(repository.create).not.toHaveBeenCalled();
        expect(repository.recut).toHaveBeenCalledWith('existing-id', expect.objectContaining({ status: CertificateDeploymentStatus.PAUSED }));
        expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'certificate-deployment.recut' }));
      });

      asCase('valid', 'Staff deploys a certificate for an event that has ended').it('starts distributing for an event that is over', async () => {
        const { service, repository } = build();
        await deploy(service);
        expect(repository.create.mock.calls[0][1].status).toBe(CertificateDeploymentStatus.DISTRIBUTING);
      });

      asCase('valid', 'Staff deploys a certificate for an event that has not ended yet').it('stays scheduled for an event still to finish', async () => {
        const { service, repository } = build({ event: { ...EVENT, event_ended: new Date(Date.now() + 3_600_000) } });
        await deploy(service);
        expect(repository.create.mock.calls[0][1].status).toBe(CertificateDeploymentStatus.SCHEDULED);
      });

      asCase('valid', 'Staff deploys a certificate from a template').it('freezes the wording and the signature lines as they read today', async () => {
        const { service, repository } = build();
        await deploy(service);
        expect(repository.create.mock.calls[0][1].design).toEqual({
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
        });
      });

      asCase('valid', 'Staff deploys a certificate from a signed template').it('never puts the signature file itself in the deployment', async () => {
        const { service, repository } = build();
        const dto = await deploy(service);
        expect(JSON.stringify(repository.create.mock.calls[0][1])).not.toContain('private/signature.png');
        expect(JSON.stringify(dto)).not.toContain('private/signature.png');
      });

      asCase('valid', 'Staff deploys a certificate').it('records the deployer from the directory, not from the request', async () => {
        const { service, repository, templates } = build();
        await deploy(service);
        expect(templates.findCoordinators).toHaveBeenCalledWith([CALLER.sub]);
        expect(repository.create.mock.calls[0][1]).toMatchObject({ deployedByUserId: CALLER.sub, deployedByName: 'Grace Hopper' });
      });

      asCase('valid', 'Staff deploys a certificate').it('issues the next reference and refreshes the template count', async () => {
        const { service, repository } = build({ highest: 13 });
        await deploy(service);
        expect(repository.create.mock.calls[0][0]).toBe(`DC-${new Date().getFullYear()}-014`);
        expect(repository.syncTemplateDeploymentCount).toHaveBeenCalledWith(VALID_TEMPLATE_ID);
      });

      asCase('valid', 'Staff deploys a certificate').it('writes who deployed it and from where to the audit trail', async () => {
        const { service, audit } = build();
        await deploy(service, { ipAddress: '203.0.113.10', userAgent: 'portal-browser' });
        expect(audit.record).toHaveBeenCalledTimes(1);
        expect(audit.record).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'certificate-deployment.created',
            actor: CALLER,
            ipAddress: '203.0.113.10',
            userAgent: 'portal-browser',
          }),
        );
      });

      asCase('valid', 'Staff deploys a certificate').it('builds a deployment the response schema accepts', async () => {
        const { service } = build();
        const dto = await deploy(service);
        expect(CertificateDeploymentResponseSchema.safeParse(dto).success).toBe(true);
      });
    });
  });
}
