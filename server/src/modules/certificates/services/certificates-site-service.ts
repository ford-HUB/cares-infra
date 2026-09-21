import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CertificateDeploymentStatus,
  NotificationCategory,
  NotificationTone,
} from '../../../infastructures/prisma/common/client';
import { NotificationScheduler } from '../../../schedulers/jobs/notification-scheduler';
import type { RequestContextDto } from '../../../shared/decorators/request-context-decorator';
import type { JwtPayload } from '../../../shared/types/jwt-payload';
import { AuditLogRecorder } from '../../audit-logs/services/audit-log-recorder';
import type {
  CertificateRecipientListDto,
  RemindRecipientsDto,
} from '../dto/certificates-site-dto';
import { CertificatesRepository } from '../repositories/certificates-repository';
import { withCertificateStorage } from './certificate-storage-guard';

/** The live page's view of who a deployment has actually reached. */
@Injectable()
export class CertificatesSiteService {
  constructor(
    private readonly repository: CertificatesRepository,
    private readonly notificationScheduler: NotificationScheduler,
    private readonly auditLogRecorder: AuditLogRecorder,
  ) {}

  async listRecipients(
    deploymentId: string,
  ): Promise<CertificateRecipientListDto> {
    if (!(await this.repository.deploymentExists(deploymentId))) {
      throw new NotFoundException('Deployment not found');
    }

    const rows = await withCertificateStorage(() =>
      this.repository.findRecipientsForDeployment(deploymentId),
    );
    return rows.map((row) => ({
      id: row.issued_certificate_id,
      certificate_number: row.certificate_number,
      user_id: row.user_id,
      recipient_name: row.recipient_name,
      hours_rendered: row.hours_rendered,
      issued_at: row.issued_at.toISOString(),
      claimed_at: row.claimed_at ? row.claimed_at.toISOString() : null,
    }));
  }

  /**
   * The "Remind N" button: nudges every covered participant who does not hold a
   * certificate yet to finish what is outstanding — the post-event questionnaire,
   * or an attendance sync the ruling is still waiting on. Once a day per person, so
   * a director pressing it twice does not spam the roster.
   */
  async remindPending(
    caller: JwtPayload,
    deploymentId: string,
    context: RequestContextDto = {},
  ): Promise<RemindRecipientsDto> {
    const deployment = await this.repository.findDeployment(deploymentId);
    if (!deployment) throw new NotFoundException('Deployment not found');
    if (deployment.status === CertificateDeploymentStatus.SCHEDULED) {
      throw new BadRequestException(
        'The event has not finished yet — there is nothing to remind participants about',
      );
    }

    const pending = await withCertificateStorage(() =>
      this.repository.findPendingParticipants(
        deploymentId,
        deployment.event_id,
      ),
    );

    const awaitingFeedback = pending.filter((one) => one.needsEvaluation);
    const awaitingAttendance = pending.filter(
      (one) => !one.needsEvaluation && one.attendancePending,
    );
    const today = new Date().toISOString().slice(0, 10);

    if (awaitingFeedback.length > 0) {
      await this.notificationScheduler.publish({
        title: `Your certificate for ${deployment.event_name} is waiting`,
        description: `Answer the post-event feedback in the app to receive your "${deployment.template_name}" certificate.`,
        category: NotificationCategory.CERTIFICATE,
        tone: NotificationTone.ATTENTION,
        userIds: awaitingFeedback.map((one) => one.userId),
        dedupeKey: `certificate-remind:${deploymentId}:${today}`,
      });
    }

    if (awaitingAttendance.length > 0) {
      await this.notificationScheduler.publish({
        title: `Sync your attendance for ${deployment.event_name}`,
        description: `Your attendance is still being confirmed. Open the app and sync your event location records so your "${deployment.template_name}" certificate can be issued.`,
        category: NotificationCategory.CERTIFICATE,
        tone: NotificationTone.ATTENTION,
        userIds: awaitingAttendance.map((one) => one.userId),
        dedupeKey: `certificate-remind:${deploymentId}:${today}`,
      });
    }

    const reminded = awaitingFeedback.length + awaitingAttendance.length;

    await this.auditLogRecorder.record({
      action: 'certificate-deployment.reminded',
      description: `Reminded ${reminded} participant${reminded === 1 ? '' : 's'} of ${deployment.event_name} about their pending certificate`,
      category: 'CERTIFICATE',
      actor: caller,
      targetType: 'certificate-deployment',
      targetLabel: `${deployment.template_name} → ${deployment.event_name}`,
      targetId: deployment.certificate_deployment_id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: {
        reference: deployment.reference,
        reminded: String(reminded),
        awaiting_feedback: String(awaitingFeedback.length),
        awaiting_attendance: String(awaitingAttendance.length),
      },
    });

    return {
      deployment_id: deployment.certificate_deployment_id,
      reminded,
      awaiting_feedback: awaitingFeedback.length,
      awaiting_attendance: awaitingAttendance.length,
    };
  }
}
