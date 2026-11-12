import { asCase } from '../../../../config/test-case';
import { BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import {
  expectSafeErrorEnvelope,
  runApiLayer,
  LayerFixture,
  autoMock,
} from '../../../../config/layer-harness';
import {
  REMIND_TITLE,
  remindPath,
  useCertificatesApp,
  VALID_DEPLOYMENT_ID,
  describeDeploymentIdTable,
  CALLER,
} from '../certificates-site-support';
import { CertificateDeploymentStatus, Prisma } from '../../../../../src/infastructures/prisma/common/client';
import { CertificatesSiteService } from '../../../../../src/modules/certificates/services/certificates-site-service';
import { HOSTILE_STRINGS, PROTOTYPE_POLLUTION_BODIES } from '../../../../config/security-payloads';

/**
 * Certificate Module · Remind Pending — invalid inputs.
 *
 * Every case here is an intentionally wrong input. A case Passes when the system
 * refuses it exactly as stated — a rejection as expected is the correct result.
 * The valid cases for this unit live in ../valid/.
 */

/* ── error handling ──────────────────────────────────────────────────────── */
{
  /**
   * Remind pending recipients — error handling: unexpected service errors and a response
   * the serializer refuses are masked as a generic 500 with nothing leaked, and the
   * service's deliberate HttpExceptions keep their status and message through the envelope.
   */
  const DELIBERATE_ERRORS = [
    { title: '404 for an unknown deployment', error: new NotFoundException('Deployment not found') },
    {
      title: '400 before the event has finished',
      error: new BadRequestException('The event has not finished yet — there is nothing to remind participants about'),
    },
    {
      title: '503 when the certificates table is not set up',
      error: new ServiceUnavailableException('Certificate records are not set up on this database yet — apply the pending migration (add_issued_certificates) and restart the server.'),
    },
  ];

  describe('certificates site · remind pending recipients — error handling', () => {
    const ctx = useCertificatesApp();

    describe(REMIND_TITLE, () => {
      const remind = () => runApiLayer(ctx.app, { method: 'post', path: remindPath() });

      asCase('invalid', 'The service fails with an unexpected internal or database error').it('masks an unexpected service error as a 500 without leaking detail', async () => {
        ctx.service.remindPending.mockRejectedValueOnce(new Error('syntax error at or near "OR"') as never);
        const outcome = await remind();
        expect(outcome.status).toBe(500);
        expectSafeErrorEnvelope(outcome);
        expect(outcome.body).toEqual({ ok: false, message: 'Internal server error' });
      });

      asCase('invalid', 'The service returns data that breaks the response schema').it('masks a response the serializer refuses as a 500', async () => {
        ctx.service.remindPending.mockResolvedValueOnce({ reminded: 'many' } as never);
        const outcome = await remind();
        expect(outcome.status).toBe(500);
        expect(outcome.body).toEqual({ ok: false, message: 'Internal server error' });
      });

      asCase('invalid', 'The service refuses the request with a deliberate HTTP error (each kind)', 'Each deliberate error keeps its status and message in the { ok: false } envelope').it.each(DELIBERATE_ERRORS)('keeps $title', async ({ error }) => {
        ctx.service.remindPending.mockRejectedValueOnce(error as never);
        const outcome = await remind();
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
   * Remind pending recipients — input validation: the action reads nothing but the
   * deployment id in its path.
   */
  const fixtures: LayerFixture<string>[] = [
    { name: 'not a uuid', input: 'deployment-1', expected: 'FAIL', message: 'A valid deployment id is required' },
    { name: 'uuid missing a character', input: VALID_DEPLOYMENT_ID.slice(0, -1), expected: 'FAIL' },
    { name: 'uuid without hyphens', input: VALID_DEPLOYMENT_ID.replace(/-/g, ''), expected: 'FAIL' },
    { name: 'uuid with surrounding spaces', input: ` ${VALID_DEPLOYMENT_ID} `, expected: 'FAIL' },
    { name: 'deployment reference instead of an id', input: 'DC-2026-001', expected: 'FAIL' },
  ];

  describe('certificates site · remind pending recipients — input validation', () => {
    const ctx = useCertificatesApp();

    describe(REMIND_TITLE, () => {
      describeDeploymentIdTable(ctx, fixtures);
    });
  });
}

/* ── normalization ───────────────────────────────────────────────────────── */
{
  /**
   * Remind pending recipients — normalisation: the service receives the validated id with
   * the caller and where the request came from, a body is ignored, and the response schema
   * keeps who was reminded off the wire.
   */
  describe('certificates site · remind pending recipients — normalisation', () => {
    const ctx = useCertificatesApp();

    describe(REMIND_TITLE, () => {

      asCase('invalid', 'Client sends body fields the endpoint does not accept').it('ignores a body it does not read', async () => {
        await runApiLayer(ctx.app, {
          method: 'post',
          path: remindPath(),
          body: { sub: 'someone-else', id: 'b3f1c2d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d', user_ids: ['someone-else'] },
        });
        expect(ctx.service.remindPending).toHaveBeenCalledWith(CALLER, VALID_DEPLOYMENT_ID, expect.anything());
      });
    });
  });
}

/* ── security ────────────────────────────────────────────────────────────── */
{
  /**
   * Remind pending recipients — security: hostile strings in the deployment id (a uuid, so
   * all must FAIL), a body the action must ignore, and the rules in the real service that
   * decide who gets a notification.
   */
  const fixtures: LayerFixture<string>[] = [
    ...HOSTILE_STRINGS.map((p): LayerFixture<string> => ({
      name: `id ← ${p.category}: ${p.label}`,
      input: p.value as string,
      expected: 'FAIL',
    })),
    { name: 'id ← uuid with SQL tail', input: `${VALID_DEPLOYMENT_ID}' OR '1'='1`, expected: 'FAIL' },
    { name: 'id ← uuid with stacked query', input: `${VALID_DEPLOYMENT_ID}; DROP TABLE "User"`, expected: 'FAIL' },
  ];

  describe('certificates site · remind pending recipients — security', () => {
    const ctx = useCertificatesApp();

    describe(REMIND_TITLE, () => {
      describe('id', () => describeDeploymentIdTable(ctx, fixtures));

      asCase('invalid', 'Attacker sends a __proto__ / constructor.prototype body', 'The body changes nothing; Object.prototype is not polluted').it.each(PROTOTYPE_POLLUTION_BODIES)('a pollution body changes nothing: $label', async (p) => {
        await runApiLayer(ctx.app, { method: 'post', path: remindPath(), rawBody: p.value as string });
        expect(ctx.service.remindPending).toHaveBeenCalledWith(CALLER, VALID_DEPLOYMENT_ID, expect.anything());
        expect(({} as any).isAdmin).toBeUndefined();
      });

      asCase('invalid', 'Client sends malformed (truncated) JSON').it('answers a malformed JSON body in the safe envelope, without reaching the service', async () => {
        const outcome = await runApiLayer(ctx.app, { method: 'post', path: remindPath(), rawBody: '{"id":' });
        expect(outcome.status).toBe(400);
        expectSafeErrorEnvelope(outcome);
        expect(ctx.service.remindPending).not.toHaveBeenCalled();
      });
    });

    // The controller's service is mocked above; who is notified lives in the real one.
    describe('remindPending (real service)', () => {
      const DEPLOYMENT = {
        certificate_deployment_id: VALID_DEPLOYMENT_ID,
        reference: 'DC-2026-001',
        event_id: 5,
        event_name: 'Coastal Clean-up Drive',
        template_name: 'Volunteer Appreciation',
        status: CertificateDeploymentStatus.DISTRIBUTING,
      };
      const PENDING = [
        { userId: 'owes-feedback', needsEvaluation: true, attendancePending: false },
        { userId: 'owes-both', needsEvaluation: true, attendancePending: true },
        { userId: 'owes-sync', needsEvaluation: false, attendancePending: true },
        { userId: 'owes-nothing', needsEvaluation: false, attendancePending: false },
      ];

      const build = (deployment: object | null = DEPLOYMENT, pending: object[] = PENDING) => {
        const repository = autoMock<any>({
          findDeployment: jest.fn().mockResolvedValue(deployment),
          findPendingParticipants: jest.fn().mockResolvedValue(pending),
        });
        const scheduler = autoMock<any>();
        const audit = autoMock<any>();
        const service = new CertificatesSiteService(repository, scheduler, audit);
        return { service, repository, scheduler, audit };
      };

      const remind = (service: CertificatesSiteService, context: object = {}) =>
        service.remindPending(CALLER as never, VALID_DEPLOYMENT_ID, context);

      asCase('invalid', 'Staff submits a request with an unknown deployment').it('refuses an unknown deployment, without notifying anyone', async () => {
        const { service, scheduler, audit } = build(null);
        await expect(remind(service)).rejects.toEqual(new NotFoundException('Deployment not found'));
        expect(scheduler.publish).not.toHaveBeenCalled();
        expect(audit.record).not.toHaveBeenCalled();
      });

      asCase('invalid', 'Staff submits a request with a deployment whose event is still to finish').it('refuses a deployment whose event is still to finish, without notifying anyone', async () => {
        const { service, repository, scheduler } = build({ ...DEPLOYMENT, status: CertificateDeploymentStatus.SCHEDULED });
        await expect(remind(service)).rejects.toBeInstanceOf(BadRequestException);
        expect(repository.findPendingParticipants).not.toHaveBeenCalled();
        expect(scheduler.publish).not.toHaveBeenCalled();
      });

      asCase('invalid', 'The certificates table has not been migrated yet').it('answers 503 when the certificates table has not been migrated', async () => {
        const { service, repository, scheduler } = build();
        repository.findPendingParticipants.mockRejectedValue(
          new Prisma.PrismaClientKnownRequestError('missing table', { code: 'P2021' }),
        );
        await expect(remind(service)).rejects.toBeInstanceOf(ServiceUnavailableException);
        expect(scheduler.publish).not.toHaveBeenCalled();
      });

      asCase('invalid', 'The database fails with another error while sending reminders').it('rethrows any other database error untouched', async () => {
        const { service, repository } = build();
        const failure = new Prisma.PrismaClientKnownRequestError('deadlock', { code: 'P2034' });
        repository.findPendingParticipants.mockRejectedValue(failure);
        await expect(remind(service)).rejects.toBe(failure);
      });
    });
  });
}
