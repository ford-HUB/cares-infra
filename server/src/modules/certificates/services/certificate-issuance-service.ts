import { Injectable, Logger } from '@nestjs/common';
import {
  CertificateDeploymentStatus,
  NotificationCategory,
  NotificationTone,
  RoleType,
} from '../../../infastructures/prisma/common/client';
import { NotificationScheduler } from '../../../schedulers/jobs/notification-scheduler';
import { AuditLogRecorder } from '../../audit-logs/services/audit-log-recorder';
import type { StoredDeploymentDesign } from '../../certificate-deployments/dto/certificate-deployments-site-dto';
import type { StoredIssuedDesign } from '../dto/certificates-mobile-dto';
import {
  CertificatesRepository,
  type DueDeploymentRow,
  type PersistIssuedCertificate,
} from '../repositories/certificates-repository';
import { recipientNameOf } from './certificate-fill';

export interface CertificateIssuanceSummary {
  deploymentId: string;
  reference: string;
  eventId: number;
  eventName: string;
  issued: number;
  distributed: number;
  participants: number;
  completed: boolean;
}

/** Idempotent: one certificate per participant per deployment, so the sweep only adds new qualifiers. */
@Injectable()
export class CertificateIssuanceService {
  private readonly logger = new Logger(CertificateIssuanceService.name);

  constructor(
    private readonly repository: CertificatesRepository,
    private readonly notificationScheduler: NotificationScheduler,
    private readonly auditLogRecorder: AuditLogRecorder,
  ) {}

  async sweep(now = new Date()): Promise<CertificateIssuanceSummary[]> {
    const due = await this.repository.findDueDeployments(now);
    const summaries: CertificateIssuanceSummary[] = [];

    for (const deployment of due) {
      try {
        summaries.push(await this.issueFor(deployment, now));
      } catch (error) {
        // One bad deployment must not block the rest.
        this.logger.error(
          `certificate issue failed for ${deployment.reference}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    return summaries;
  }

  private async issueFor(
    deployment: DueDeploymentRow,
    now: Date,
  ): Promise<CertificateIssuanceSummary> {
    const eligible = await this.repository.findEligibleParticipants(
      deployment.certificate_deployment_id,
      deployment.event_id,
    );

    const design = await this.freezeIssuedDesign(
      deployment.certificate_template_id,
      deployment.design as unknown as StoredDeploymentDesign,
    );

    const year = now.getFullYear();
    let sequence = await this.repository.highestCertificateSequence(year);

    const certificates: PersistIssuedCertificate[] = eligible.map(
      (participant) => ({
        certificateNumber: `CERT-${year}-${String(++sequence).padStart(6, '0')}`,
        certificateDeploymentId: deployment.certificate_deployment_id,
        eventId: deployment.event_id,
        userId: participant.userId,
        recipientName: recipientNameOf(participant),
        eventName: deployment.event.title,
        eventDate: deployment.event.event_started,
        hoursRendered: participant.hoursRendered,
        organization: deployment.event.organizer_name,
        templateName: deployment.template_name,
        category: deployment.category,
        orientation: deployment.orientation,
        design,
      }),
    );

    const covered = await this.repository.countCoveredParticipants(
      deployment.event_id,
    );
    // Ruled roster is the true denominator, but never below what's distributed.
    const participants = Math.max(
      covered,
      deployment.distributed + certificates.length,
    );
    const distributed = deployment.distributed + certificates.length;
    const completed = participants > 0 && distributed >= participants;

    await this.repository.issueBatch(
      deployment.certificate_deployment_id,
      deployment.certificate_template_id,
      certificates,
      participants,
      completed
        ? CertificateDeploymentStatus.COMPLETED
        : CertificateDeploymentStatus.DISTRIBUTING,
    );

    if (certificates.length > 0) {
      await this.announce(deployment, certificates, completed);
    }

    return {
      deploymentId: deployment.certificate_deployment_id,
      reference: deployment.reference,
      eventId: deployment.event_id,
      eventName: deployment.event.title,
      issued: certificates.length,
      distributed,
      participants,
      completed,
    };
  }

  /** A missing signature prints blank instead of blocking the batch. */
  private async freezeIssuedDesign(
    templateId: string,
    design: StoredDeploymentDesign,
  ): Promise<StoredIssuedDesign> {
    const signatories = design.signatories ?? [];
    const keys = await this.repository.findSignatureKeys(
      signatories.map((line) => line.coordinator_id),
    );

    return {
      ...design,
      template_id: templateId,
      signatories: signatories.map((line) => ({
        id: line.id,
        coordinator_id: line.coordinator_id,
        name: line.name,
        title: line.title,
        department: line.department,
        signature_key: keys.get(line.coordinator_id) ?? null,
      })),
    };
  }

  private async announce(
    deployment: DueDeploymentRow,
    certificates: PersistIssuedCertificate[],
    completed: boolean,
  ): Promise<void> {
    await this.notificationScheduler.publish({
      title: `Your certificate for ${deployment.event.title} is ready`,
      description: `${deployment.template_name} has been issued to you. Open the Certificates screen to view and download it.`,
      category: NotificationCategory.CERTIFICATE,
      tone: NotificationTone.INFO,
      userIds: certificates.map((certificate) => certificate.userId),
      audienceRole: RoleType.VOLUNTEER,
      dedupeKey: `certificate-issued:${deployment.certificate_deployment_id}`,
    });

    await this.notificationScheduler.publish({
      title: `${certificates.length} certificate${certificates.length === 1 ? '' : 's'} issued for ${deployment.event.title}`,
      description: `${deployment.template_name} (${deployment.reference}) went out to ${certificates.length} participant${certificates.length === 1 ? '' : 's'}${completed ? ' — every covered participant now holds theirs.' : '.'}`,
      category: NotificationCategory.CERTIFICATE,
      tone: NotificationTone.INFO,
      href: '/admin/deployed-certificate-templates',
      roles: [RoleType.DIRECTOR, RoleType.COORDINATOR],
      dedupeKey: `certificate-batch:${deployment.certificate_deployment_id}:${deployment.distributed + certificates.length}`,
    });

    await this.auditLogRecorder.record({
      action: 'certificate.issued',
      description: `Issued ${certificates.length} "${deployment.template_name}" certificate${certificates.length === 1 ? '' : 's'} for ${deployment.event.title}`,
      category: 'CERTIFICATE',
      actor: null,
      targetType: 'certificate-deployment',
      targetLabel: `${deployment.template_name} → ${deployment.event.title}`,
      targetId: deployment.certificate_deployment_id,
      metadata: {
        reference: deployment.reference,
        issued: String(certificates.length),
        distributed: String(deployment.distributed + certificates.length),
      },
    });
  }
}
