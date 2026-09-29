import { Injectable } from '@nestjs/common';
import {
  CertificateDeploymentStatus,
  CertificateOrientation,
  CertificateTemplateCategory,
  Prisma,
} from '../../../infastructures/prisma/common/client';
import { PrismaService } from '../../../infastructures/prisma/prisma-service';
import type { StoredDeploymentDesign } from '../dto/certificate-deployments-site-dto';

export type CertificateDeploymentRow =
  Prisma.CertificateDeploymentGetPayload<object>;

export interface PersistDeployment {
  certificateTemplateId: string;
  templateName: string;
  category: CertificateTemplateCategory;
  orientation: CertificateOrientation;
  design: StoredDeploymentDesign;
  eventId: number;
  eventName: string;
  eventVenue: string;
  eventDate: Date;
  status: CertificateDeploymentStatus;
  participants: number;
  deployedByUserId: string | null;
  deployedByName: string;
}

@Injectable()
export class CertificateDeploymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<CertificateDeploymentRow[]> {
    return this.prisma.certificateDeployment.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<CertificateDeploymentRow | null> {
    return this.prisma.certificateDeployment.findUnique({
      where: { certificate_deployment_id: id },
    });
  }

  async findByTemplateAndEvent(
    templateId: string,
    eventId: number,
  ): Promise<CertificateDeploymentRow | null> {
    return this.prisma.certificateDeployment.findUnique({
      where: {
        certificate_template_id_event_id: {
          certificate_template_id: templateId,
          event_id: eventId,
        },
      },
    });
  }

  async create(
    reference: string,
    data: PersistDeployment,
  ): Promise<CertificateDeploymentRow> {
    return this.prisma.certificateDeployment.create({
      data: { reference, ...toDeploymentData(data) },
    });
  }

  /** Re-cutting an existing deployment keeps its reference and its tallies. */
  async recut(
    id: string,
    data: PersistDeployment,
  ): Promise<CertificateDeploymentRow> {
    return this.prisma.certificateDeployment.update({
      where: { certificate_deployment_id: id },
      data: toDeploymentData(data),
    });
  }

  async updateStatus(
    id: string,
    status: CertificateDeploymentStatus,
  ): Promise<CertificateDeploymentRow> {
    return this.prisma.certificateDeployment.update({
      where: { certificate_deployment_id: id },
      data: { status },
    });
  }

  /**
   * Writes the template's "deployed to N events" tally back from the deployments
   * themselves, so the number on the template card cannot drift from the live page.
   */
  async syncTemplateDeploymentCount(templateId: string): Promise<void> {
    const events = await this.prisma.certificateDeployment.findMany({
      where: { certificate_template_id: templateId },
      select: { event_id: true },
      distinct: ['event_id'],
    });

    await this.prisma.certificateTemplate.update({
      where: { certificate_template_id: templateId },
      data: { deployed_events: events.length },
    });
  }

  async highestReferenceSequence(year: number): Promise<number> {
    const latest = await this.prisma.certificateDeployment.findFirst({
      where: { reference: { startsWith: `DC-${year}-` } },
      orderBy: { reference: 'desc' },
      select: { reference: true },
    });

    if (!latest) return 0;

    const sequence = Number(latest.reference.split('-')[2]);
    return Number.isFinite(sequence) ? sequence : 0;
  }
}

function toDeploymentData(data: PersistDeployment) {
  return {
    certificate_template_id: data.certificateTemplateId,
    template_name: data.templateName,
    category: data.category,
    orientation: data.orientation,
    design: data.design as unknown as Prisma.InputJsonValue,
    event_id: data.eventId,
    event_name: data.eventName,
    event_venue: data.eventVenue,
    event_date: data.eventDate,
    status: data.status,
    participants: data.participants,
    deployed_by_user_id: data.deployedByUserId,
    deployed_by_name: data.deployedByName,
  };
}
