import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CertificateDeploymentStatus,
  CertificateTemplateStatus,
  EventStatus,
} from '../../../infastructures/prisma/common/client';
import type { RequestContextDto } from '../../../shared/decorators/request-context-decorator';
import type { JwtPayload } from '../../../shared/types/jwt-payload';
import { AuditLogRecorder } from '../../audit-logs/services/audit-log-recorder';
import { EventsRepository } from '../../events/repositories/events-repository';
import type { StoredCertificateDesign } from '../../certificate-templates/dto/certificate-templates-site-dto';
import {
  CertificateTemplatesRepository,
  type CertificateTemplateRow,
} from '../../certificate-templates/repositories/certificate-templates-repository';
import { toDesignDto } from '../../certificate-templates/services/certificate-design-mapper';
import type {
  CertificateDeploymentDto,
  DeployCertificateDto,
  DeployedSignatoryDto,
  StoredDeploymentDesign,
  UpdateDeploymentStatusDto,
} from '../dto/certificate-deployments-site-dto';
import {
  CertificateDeploymentsRepository,
  type CertificateDeploymentRow,
} from '../repositories/certificate-deployments-repository';

type DeploymentStatus = CertificateDeploymentDto['status'];
type Category = CertificateDeploymentDto['category'];
type Orientation = CertificateDeploymentDto['orientation'];

@Injectable()
export class CertificateDeploymentsSiteService {
  constructor(
    private readonly repository: CertificateDeploymentsRepository,
    private readonly templatesRepository: CertificateTemplatesRepository,
    private readonly eventsRepository: EventsRepository,
    private readonly auditLogRecorder: AuditLogRecorder,
  ) {}

  async listDeployments(): Promise<CertificateDeploymentDto[]> {
    const deployments = await this.repository.findAll();
    return deployments.map((deployment) => mapToDto(deployment));
  }

  /**
   * Puts one template onto one event. Everything the sheet is made of — design,
   * artwork, wording and the people signing it — is copied into the deployment as it
   * reads today: the template stays editable afterwards, and a certificate already
   * promised to a volunteer must not change wording underneath them.
   */
  async deploy(
    caller: JwtPayload,
    data: DeployCertificateDto,
    context: RequestContextDto = {},
  ): Promise<CertificateDeploymentDto> {
    const template = await this.templatesRepository.findById(
      data.certificate_template_id,
    );
    if (!template) {
      throw new NotFoundException('Certificate template not found');
    }
    if (template.status !== CertificateTemplateStatus.PUBLISHED) {
      throw new BadRequestException(
        'Only a published template can be deployed to an event',
      );
    }

    const event = await this.eventsRepository.findById(data.event_id);
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    if (event.status === EventStatus.Cancelled) {
      throw new BadRequestException(
        'That event was cancelled — nothing can be deployed to it',
      );
    }

    const existing = await this.repository.findByTemplateAndEvent(
      template.certificate_template_id,
      event.event_id,
    );
    // Re-deploying is how a director pushes a design change onto an event that has not
    // handed anything out yet. Once sheets are with recipients the wording is settled,
    // and a second deployment would quietly disagree with what they already hold.
    if (existing && existing.distributed > 0) {
      throw new ConflictException(
        `${template.name} is already distributing for this event`,
      );
    }

    const [author] = await this.templatesRepository.findCoordinators([
      caller.sub,
    ]);

    const persisted = {
      certificateTemplateId: template.certificate_template_id,
      templateName: template.name,
      category: template.category,
      orientation: template.orientation,
      design: freezeDesign(template),
      eventId: event.event_id,
      eventName: event.title,
      eventVenue: event.location,
      eventDate: event.event_started,
      status: existing?.status ?? deriveStatus(event.event_ended),
      participants: event.participants,
      deployedByUserId: author?.user_id ?? null,
      deployedByName: author
        ? `${author.firstname} ${author.lastname}`.trim()
        : '',
    };

    const deployment = existing
      ? await this.repository.recut(
          existing.certificate_deployment_id,
          persisted,
        )
      : await this.repository.create(await this.nextReference(), persisted);

    await this.repository.syncTemplateDeploymentCount(
      template.certificate_template_id,
    );

    await this.auditLogRecorder.record({
      action: existing
        ? 'certificate-deployment.recut'
        : 'certificate-deployment.created',
      description: existing
        ? `Re-deployed "${template.name}" to ${event.title}`
        : `Deployed "${template.name}" to ${event.title}`,
      category: 'CERTIFICATE',
      actor: caller,
      targetType: 'certificate-deployment',
      targetLabel: `${template.name} → ${event.title}`,
      targetId: deployment.certificate_deployment_id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: {
        reference: deployment.reference,
        template: template.reference,
        participants: String(deployment.participants),
      },
    });

    return mapToDto(deployment);
  }

  async updateStatus(
    caller: JwtPayload,
    id: string,
    data: UpdateDeploymentStatusDto,
    context: RequestContextDto = {},
  ): Promise<CertificateDeploymentDto> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException('Deployment not found');
    }
    if (existing.status === CertificateDeploymentStatus.COMPLETED) {
      throw new BadRequestException(
        'That deployment is already completed — every participant has their certificate',
      );
    }

    const next = toPrismaStatus(data.status);
    if (next === existing.status) {
      return mapToDto(existing);
    }

    const updated = await this.repository.updateStatus(id, next);

    await this.auditLogRecorder.record({
      action: 'certificate-deployment.status.updated',
      description: `Set "${updated.template_name}" for ${updated.event_name} to ${data.status}`,
      category: 'CERTIFICATE',
      // Pausing stops sheets reaching people who are expecting them, so it is not the
      // same routine edit a wording change is.
      severity: next === CertificateDeploymentStatus.PAUSED ? 'NOTICE' : 'INFO',
      actor: caller,
      targetType: 'certificate-deployment',
      targetLabel: `${updated.template_name} → ${updated.event_name}`,
      targetId: updated.certificate_deployment_id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      changes: [
        {
          field: 'status',
          before: fromPrismaStatus(existing.status),
          after: fromPrismaStatus(updated.status),
        },
      ],
    });

    return mapToDto(updated);
  }

  /** `DC-2026-014`, on the same yearly sequence the template references use. */
  private async nextReference(): Promise<string> {
    const year = new Date().getFullYear();
    const highest = await this.repository.highestReferenceSequence(year);
    return `DC-${year}-${String(highest + 1).padStart(3, '0')}`;
  }
}

/**
 * A deployment queued against an event that has not finished stays `scheduled`;
 * releasing starts once the event is closed out, which is what the live page's own
 * status hint promises.
 */
function deriveStatus(eventEnded: Date): CertificateDeploymentStatus {
  return eventEnded.getTime() <= Date.now()
    ? CertificateDeploymentStatus.DISTRIBUTING
    : CertificateDeploymentStatus.SCHEDULED;
}

/** The template's sheet as it reads today, signature lines copied in beside it. */
function freezeDesign(
  template: CertificateTemplateRow,
): StoredDeploymentDesign {
  const design = template.design as unknown as StoredCertificateDesign;

  const signatories: DeployedSignatoryDto[] = template.signatories.map(
    (signatory) => ({
      id: signatory.certificate_template_signatory_id,
      coordinator_id: signatory.coordinator_user_id,
      name: signatory.name,
      title: signatory.title,
      department: signatory.department,
      // Frozen with the line: the printed sheet still resolves it against the
      // coordinator's own signature image at issue time.
      signature_token: signatory.signature_token,
      has_signature: Boolean(signatory.coordinator.accounts[0]?.signature_url),
    }),
  );

  return { ...design, signatories };
}

function mapToDto(
  deployment: CertificateDeploymentRow,
): CertificateDeploymentDto {
  const design = deployment.design as unknown as StoredDeploymentDesign;

  return {
    id: deployment.certificate_deployment_id,
    reference: deployment.reference,
    template_id: deployment.certificate_template_id,
    template_name: deployment.template_name,
    category: deployment.category.toLowerCase() as Category,
    orientation: deployment.orientation.toLowerCase() as Orientation,
    design: {
      // The artwork still lives with the template the deployment was cut from, which is
      // why that template cannot be deleted while a deployment holds it.
      ...toDesignDto(design, deployment.certificate_template_id),
      signatories: design.signatories ?? [],
    },
    event: {
      id: String(deployment.event_id),
      name: deployment.event_name,
      venue: deployment.event_venue,
      date: deployment.event_date.toISOString(),
    },
    status: fromPrismaStatus(deployment.status),
    participants: deployment.participants,
    distributed: deployment.distributed,
    claimed: deployment.claimed,
    deployed_at: deployment.createdAt.toISOString(),
    deployed_by: deployment.deployed_by_name,
  };
}

function toPrismaStatus(status: DeploymentStatus): CertificateDeploymentStatus {
  return status.toUpperCase() as CertificateDeploymentStatus;
}

function fromPrismaStatus(
  status: CertificateDeploymentStatus,
): DeploymentStatus {
  return status.toLowerCase() as DeploymentStatus;
}
