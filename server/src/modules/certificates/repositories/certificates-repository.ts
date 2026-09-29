import { Injectable } from '@nestjs/common';
import {
  AttendanceStatus,
  CertificateDeploymentStatus,
  CertificateOrientation,
  CertificateTemplateCategory,
  EventStatus,
  Prisma,
} from '../../../infastructures/prisma/common/client';
import { PrismaService } from '../../../infastructures/prisma/prisma-service';
import type { StoredIssuedDesign } from '../dto/certificates-mobile-dto';

export type IssuedCertificateRow = Prisma.IssuedCertificateGetPayload<object>;

/** A deployment the sweep may hand certificates out for, with the event it covers. */
export type DueDeploymentRow = Prisma.CertificateDeploymentGetPayload<{
  include: {
    event: {
      select: {
        event_id: true;
        title: true;
        event_started: true;
        event_ended: true;
        organizer_name: true;
        status: true;
      };
    };
  };
}>;

/** A participant who finished the event and its requirements, not yet issued. */
export interface EligibleParticipant {
  userId: string;
  firstname: string;
  middleName: string | null;
  lastname: string;
  hoursRendered: number;
}

export interface PersistIssuedCertificate {
  certificateNumber: string;
  certificateDeploymentId: string;
  eventId: number;
  userId: string;
  recipientName: string;
  eventName: string;
  eventDate: Date;
  hoursRendered: number;
  organization: string;
  templateName: string;
  category: CertificateTemplateCategory;
  orientation: CertificateOrientation;
  design: StoredIssuedDesign;
}

@Injectable()
export class CertificatesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Deployments still handing out — or waiting to — whose event has finished. The
   * status sweep flips events to Completed on its own minute, so the end time is
   * checked as well rather than waiting on it. Paused and completed deployments are
   * left alone: the first is the director's hold, the second has nothing left to do.
   */
  async findDueDeployments(now: Date): Promise<DueDeploymentRow[]> {
    return this.prisma.certificateDeployment.findMany({
      where: {
        status: {
          in: [
            CertificateDeploymentStatus.SCHEDULED,
            CertificateDeploymentStatus.DISTRIBUTING,
          ],
        },
        event: {
          OR: [
            { status: EventStatus.Completed },
            {
              status: { not: EventStatus.Cancelled },
              event_ended: { lte: now },
            },
          ],
        },
      },
      include: {
        event: {
          select: {
            event_id: true,
            title: true,
            event_started: true,
            event_ended: true,
            organizer_name: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Who has earned a certificate on this deployment and does not hold one yet: the
   * geofence ruling marked them COMPLETED and they answered the post-event
   * questionnaire — the requirement the app gates the certificate on.
   */
  async findEligibleParticipants(
    deploymentId: string,
    eventId: number,
  ): Promise<EligibleParticipant[]> {
    const rows = await this.prisma.eventAttendance.findMany({
      where: {
        event_id: eventId,
        status: AttendanceStatus.COMPLETED,
        user: {
          evaluation_responses: { some: { event_id: eventId } },
          issued_certificates: {
            none: { certificate_deployment_id: deploymentId },
          },
        },
      },
      select: {
        hours_rendered: true,
        user: {
          select: {
            user_id: true,
            firstname: true,
            middle_name: true,
            lastname: true,
          },
        },
      },
      orderBy: { registered_at: 'asc' },
    });

    return rows.map((row) => ({
      userId: row.user.user_id,
      firstname: row.user.firstname,
      middleName: row.user.middle_name,
      lastname: row.user.lastname,
      hoursRendered: row.hours_rendered ?? 0,
    }));
  }

  /** Registrations the ruling did not mark absent — the roster a deployment covers. */
  async countCoveredParticipants(eventId: number): Promise<number> {
    return this.prisma.eventAttendance.count({
      where: {
        event_id: eventId,
        status: { not: AttendanceStatus.ABSENT },
      },
    });
  }

  /** The signature image each coordinator has on file today, keyed by user id. */
  async findSignatureKeys(
    coordinatorIds: string[],
  ): Promise<Map<string, string | null>> {
    if (coordinatorIds.length === 0) return new Map();

    const accounts = await this.prisma.account.findMany({
      where: { user_id: { in: coordinatorIds } },
      select: { user_id: true, signature_url: true },
    });

    const keys = new Map<string, string | null>();
    for (const account of accounts) {
      if (!keys.get(account.user_id)) {
        keys.set(account.user_id, account.signature_url ?? null);
      }
    }
    return keys;
  }

  async highestCertificateSequence(year: number): Promise<number> {
    const latest = await this.prisma.issuedCertificate.findFirst({
      where: { certificate_number: { startsWith: `CERT-${year}-` } },
      orderBy: { certificate_number: 'desc' },
      select: { certificate_number: true },
    });

    if (!latest) return 0;

    const sequence = Number(latest.certificate_number.split('-')[2]);
    return Number.isFinite(sequence) ? sequence : 0;
  }

  /**
   * Writes one batch for a deployment and brings its tallies up to date in the same
   * transaction, so the live page never shows more distributed than rows exist.
   * `participants` is re-read from the roster: the deploy took a snapshot of the
   * event's headcount, and by now the ruling has settled who actually took part.
   */
  async issueBatch(
    deploymentId: string,
    templateId: string,
    certificates: PersistIssuedCertificate[],
    participants: number,
    status: CertificateDeploymentStatus,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      if (certificates.length > 0) {
        await tx.issuedCertificate.createMany({
          data: certificates.map(toIssuedData),
          skipDuplicates: true,
        });
        await tx.certificateTemplate.update({
          where: { certificate_template_id: templateId },
          data: { issued: { increment: certificates.length } },
        });
      }

      const distributed = await tx.issuedCertificate.count({
        where: { certificate_deployment_id: deploymentId },
      });
      const claimed = await tx.issuedCertificate.count({
        where: {
          certificate_deployment_id: deploymentId,
          claimed_at: { not: null },
        },
      });

      await tx.certificateDeployment.update({
        where: { certificate_deployment_id: deploymentId },
        data: { participants, distributed, claimed, status },
      });
    });
  }

  async findForUser(userId: string): Promise<IssuedCertificateRow[]> {
    return this.prisma.issuedCertificate.findMany({
      where: { user_id: userId },
      orderBy: { issued_at: 'desc' },
    });
  }

  async findByIdForUser(
    id: string,
    userId: string,
  ): Promise<IssuedCertificateRow | null> {
    return this.prisma.issuedCertificate.findFirst({
      where: { issued_certificate_id: id, user_id: userId },
    });
  }

  /** First open only; the deployment's opened count moves with it. */
  async markClaimed(id: string, at: Date): Promise<IssuedCertificateRow> {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.issuedCertificate.update({
        where: { issued_certificate_id: id },
        data: { claimed_at: at },
      });
      await tx.certificateDeployment.update({
        where: {
          certificate_deployment_id: updated.certificate_deployment_id,
        },
        data: { claimed: { increment: 1 } },
      });
      return updated;
    });
  }

  async findRecipientsForDeployment(
    deploymentId: string,
  ): Promise<IssuedCertificateRow[]> {
    return this.prisma.issuedCertificate.findMany({
      where: { certificate_deployment_id: deploymentId },
      orderBy: [{ recipient_name: 'asc' }],
    });
  }

  /**
   * Covered participants still without a certificate on this deployment: they were
   * not ruled absent, but the ruling or the questionnaire is outstanding. These are
   * who a director's "Remind" reaches.
   */
  async findPendingParticipants(
    deploymentId: string,
    eventId: number,
  ): Promise<
    { userId: string; needsEvaluation: boolean; attendancePending: boolean }[]
  > {
    const rows = await this.prisma.eventAttendance.findMany({
      where: {
        event_id: eventId,
        status: { not: AttendanceStatus.ABSENT },
        user: {
          issued_certificates: {
            none: { certificate_deployment_id: deploymentId },
          },
        },
      },
      select: {
        user_id: true,
        status: true,
        user: {
          select: {
            evaluation_responses: {
              where: { event_id: eventId },
              select: { evaluation_response_id: true },
              take: 1,
            },
          },
        },
      },
    });

    return rows.map((row) => ({
      userId: row.user_id,
      needsEvaluation: row.user.evaluation_responses.length === 0,
      attendancePending: row.status === AttendanceStatus.PENDING,
    }));
  }

  async findDeployment(deploymentId: string) {
    return this.prisma.certificateDeployment.findUnique({
      where: { certificate_deployment_id: deploymentId },
      select: {
        certificate_deployment_id: true,
        reference: true,
        template_name: true,
        event_id: true,
        event_name: true,
        status: true,
      },
    });
  }

  async deploymentExists(deploymentId: string): Promise<boolean> {
    const row = await this.prisma.certificateDeployment.findUnique({
      where: { certificate_deployment_id: deploymentId },
      select: { certificate_deployment_id: true },
    });
    return Boolean(row);
  }
}

function toIssuedData(
  data: PersistIssuedCertificate,
): Prisma.IssuedCertificateCreateManyInput {
  return {
    certificate_number: data.certificateNumber,
    certificate_deployment_id: data.certificateDeploymentId,
    event_id: data.eventId,
    user_id: data.userId,
    recipient_name: data.recipientName,
    event_name: data.eventName,
    event_date: data.eventDate,
    hours_rendered: data.hoursRendered,
    organization: data.organization,
    template_name: data.templateName,
    category: data.category,
    orientation: data.orientation,
    design: data.design as unknown as Prisma.InputJsonValue,
  };
}
