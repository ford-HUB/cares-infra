import { asCase } from '../../../../config/test-case';
import { LayerFixture, runApiLayer, autoMock } from '../../../../config/layer-harness';
import {
  REMIND_RESPONSE,
  REMIND_TITLE,
  VALID_DEPLOYMENT_ID,
  describeDeploymentIdTable,
  remindPath,
  useCertificatesApp,
  CALLER,
} from '../certificates-site-support';
import { CertificateDeploymentStatus, NotificationCategory, RoleType } from '../../../../../src/infastructures/prisma/common/client';
import { CertificatesSiteService } from '../../../../../src/modules/certificates/services/certificates-site-service';

/**
 * Certificate Module · Remind Pending — valid inputs.
 *
 * Every case here is a legitimate input the system must accept.
 * The invalid cases for this unit live in ../invalid/.
 */

/* ── input validation ────────────────────────────────────────────────────── */
{
  /**
   * Remind pending recipients — input validation: the action reads nothing but the
   * deployment id in its path.
   */
  const fixtures: LayerFixture<string>[] = [
    { name: 'valid uuid', input: VALID_DEPLOYMENT_ID, expected: 'PASS' },
    { name: 'upper-case uuid', input: VALID_DEPLOYMENT_ID.toUpperCase(), expected: 'PASS' },
  ];

  describe('certificates site · remind pending recipients — input validation', () => {
    const ctx = useCertificatesApp();

    describe(REMIND_TITLE, () => {
      describeDeploymentIdTable(ctx, fixtures);

      asCase('valid', 'Staff submits a valid request').it('answers 200 in the success envelope', async () => {
        const outcome = await runApiLayer(ctx.app, { method: 'post', path: remindPath() });
        expect(outcome.status).toBe(200);
        expect(outcome.body).toEqual({ ok: true, message: 'Participants reminded', data: REMIND_RESPONSE });
      });
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
      asCase('valid', 'Staff submits a valid request').it('passes the caller, the id and the request context to the service', async () => {
        await runApiLayer(ctx.app, { method: 'post', path: remindPath(), headers: { 'User-Agent': 'portal-browser' } });
        expect(ctx.service.remindPending).toHaveBeenCalledTimes(1);
        expect(ctx.service.remindPending).toHaveBeenCalledWith(
          CALLER,
          VALID_DEPLOYMENT_ID,
          expect.objectContaining({ userAgent: 'portal-browser', ipAddress: expect.any(String) }),
        );
      });

      asCase('valid', 'The service returns internal fields along with the result').it('keeps the list of who was reminded off the wire', async () => {
        ctx.service.remindPending.mockResolvedValueOnce({ ...REMIND_RESPONSE, user_ids: ['volunteer-user-id'] } as never);
        const outcome = await runApiLayer(ctx.app, { method: 'post', path: remindPath() });
        expect(outcome.status).toBe(200);
        expect(outcome.body.data).toEqual(REMIND_RESPONSE);
      });
    });
  });
}

/* ── security ────────────────────────────────────────────────────────────── */
{
  describe('certificates site · remind pending recipients — security', () => {
    // Who is notified lives in the real service, built per case below.
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

      asCase('valid', 'Staff sends reminders for a deployment whose event has ended').it('looks up the pending participants of this deployment and its event', async () => {
        const { service, repository } = build();
        await remind(service);
        expect(repository.findPendingParticipants).toHaveBeenCalledWith(VALID_DEPLOYMENT_ID, DEPLOYMENT.event_id);
      });

      asCase('valid', 'Staff sends reminders for a deployment whose event has ended').it('asks those who owe feedback for the feedback, and them alone', async () => {
        const { service, scheduler } = build();
        await remind(service);
        expect(scheduler.publish).toHaveBeenCalledWith(
          expect.objectContaining({
            title: `Your certificate for ${DEPLOYMENT.event_name} is waiting`,
            userIds: ['owes-feedback', 'owes-both'],
          }),
        );
      });

      asCase('valid', 'Staff sends reminders for a deployment whose event has ended').it('asks those only awaiting attendance to sync, and never reminds anyone twice', async () => {
        const { service, scheduler } = build();
        await remind(service);
        expect(scheduler.publish).toHaveBeenCalledWith(
          expect.objectContaining({
            title: `Sync your attendance for ${DEPLOYMENT.event_name}`,
            userIds: ['owes-sync'],
          }),
        );
        const everyone = scheduler.publish.mock.calls.flatMap(([notice]: any[]) => notice.userIds);
        expect(new Set(everyone).size).toBe(everyone.length);
        expect(everyone).not.toContain('owes-nothing');
      });

      asCase('valid', 'Staff sends reminders twice on the same day').it('sends volunteers one reminder per deployment per day', async () => {
        const { service, scheduler } = build();
        await remind(service);
        const today = new Date().toISOString().slice(0, 10);
        for (const [notice] of scheduler.publish.mock.calls) {
          expect(notice).toMatchObject({
            category: NotificationCategory.CERTIFICATE,
            audienceRole: RoleType.VOLUNTEER,
            dedupeKey: `certificate-remind:${VALID_DEPLOYMENT_ID}:${today}`,
          });
        }
      });

      asCase('valid', 'Staff sends reminders for a deployment whose event has ended').it('reports how many were reminded, split by what they owe', async () => {
        const { service } = build();
        await expect(remind(service)).resolves.toEqual({
          deployment_id: VALID_DEPLOYMENT_ID,
          reminded: 3,
          awaiting_feedback: 2,
          awaiting_attendance: 1,
        });
      });

      asCase('valid', 'Staff sends reminders when nobody is pending').it('notifies nobody when nothing is pending', async () => {
        const { service, scheduler } = build(DEPLOYMENT, []);
        await expect(remind(service)).resolves.toMatchObject({ reminded: 0 });
        expect(scheduler.publish).not.toHaveBeenCalled();
      });

      asCase('valid', 'Staff sends reminders').it('writes who sent it and from where to the audit trail', async () => {
        const { service, audit } = build();
        await remind(service, { ipAddress: '203.0.113.10', userAgent: 'portal-browser' });
        expect(audit.record).toHaveBeenCalledTimes(1);
        expect(audit.record).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'certificate-deployment.reminded',
            actor: CALLER,
            ipAddress: '203.0.113.10',
            userAgent: 'portal-browser',
          }),
        );
      });
    });
  });
}
