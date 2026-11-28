import { Injectable } from '@nestjs/common';
import {
  AssistanceRequestStatus,
  Prisma,
  type AssistanceCategory,
  type AssistanceUrgency,
} from '../../../infastructures/prisma/common/client';
import { PrismaService } from '../../../infastructures/prisma/prisma-service';

export interface AssistanceRequestFieldsInput {
  title: string;
  category: AssistanceCategory;
  description: string;
  urgency: AssistanceUrgency;
  locationLatitude: number | null;
  locationLongitude: number | null;
  locationDetails: string | null;
}

export interface CreateAssistanceRequestInput extends AssistanceRequestFieldsInput {
  userId: string;
  householdSize: number;
  attachments: { name: string; url: string; mime: string; sizeBytes: number }[];
}

const requestInclude = {
  attachments: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.AssistanceRequestInclude;

export type AssistanceRequestRow = Prisma.AssistanceRequestGetPayload<{
  include: typeof requestInclude;
}>;

const siteRequestInclude = {
  ...requestInclude,
  user: {
    select: {
      firstname: true,
      lastname: true,
      address_barangay: true,
      accounts: { select: { email: true }, take: 1 },
      role: { select: { type: true } },
    },
  },
} satisfies Prisma.AssistanceRequestInclude;

export type SiteAssistanceRequestRow = Prisma.AssistanceRequestGetPayload<{
  include: typeof siteRequestInclude;
}>;

export interface AssistanceTransitionInput {
  status: AssistanceRequestStatus;
  screenedAt?: Date;
  decidedAt?: Date;
  releasedAt?: Date;
  /** Undefined keeps the existing note. */
  statusNote?: string | null;
}

@Injectable()
export class AssistanceRequestsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Newest first. */
  async listAll(): Promise<SiteAssistanceRequestRow[]> {
    return this.prisma.assistanceRequest.findMany({
      include: siteRequestInclude,
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async findByIdForSite(
    requestId: string,
  ): Promise<SiteAssistanceRequestRow | null> {
    return this.prisma.assistanceRequest.findUnique({
      where: { assistance_request_id: requestId },
      include: siteRequestInclude,
    });
  }

  async findAttachment(requestId: string, attachmentId: string) {
    return this.prisma.assistanceRequestAttachment.findFirst({
      where: {
        assistance_request_attachment_id: attachmentId,
        assistance_request_id: requestId,
      },
    });
  }

  /** Moves only while in [fromStatuses], so a concurrent edit/cancel wins. Null if it moved on. */
  async transitionIfIn(
    requestId: string,
    fromStatuses: readonly AssistanceRequestStatus[],
    input: AssistanceTransitionInput,
  ): Promise<SiteAssistanceRequestRow | null> {
    const { count } = await this.prisma.assistanceRequest.updateMany({
      where: {
        assistance_request_id: requestId,
        status: { in: [...fromStatuses] },
      },
      data: {
        status: input.status,
        ...(input.screenedAt ? { screened_at: input.screenedAt } : {}),
        ...(input.decidedAt ? { decided_at: input.decidedAt } : {}),
        ...(input.releasedAt ? { released_at: input.releasedAt } : {}),
        ...(input.statusNote !== undefined
          ? { status_note: input.statusNote }
          : {}),
      },
    });
    if (count === 0) return null;
    return this.findByIdForSite(requestId);
  }

  async listForUser(userId: string): Promise<AssistanceRequestRow[]> {
    return this.prisma.assistanceRequest.findMany({
      where: { user_id: userId },
      include: requestInclude,
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  /** Null when not theirs or gone. */
  async findForUser(
    userId: string,
    requestId: string,
  ): Promise<AssistanceRequestRow | null> {
    return this.prisma.assistanceRequest.findFirst({
      where: { assistance_request_id: requestId, user_id: userId },
      include: requestInclude,
    });
  }

  /** Applies only while still editable, so a concurrent staff action wins. Null otherwise. */
  async updateFieldsIfEditable(
    requestId: string,
    editableStatus: AssistanceRequestStatus,
    fields: AssistanceRequestFieldsInput,
  ): Promise<AssistanceRequestRow | null> {
    const { count } = await this.prisma.assistanceRequest.updateMany({
      where: {
        assistance_request_id: requestId,
        status: editableStatus,
        screened_at: null,
      },
      data: toFieldData(fields),
    });
    if (count === 0) return null;
    return this.prisma.assistanceRequest.findUnique({
      where: { assistance_request_id: requestId },
      include: requestInclude,
    });
  }

  /** Only while in [cancellableStatuses]; null if it moved on. */
  async cancelIfCancellable(
    requestId: string,
    cancellableStatuses: readonly AssistanceRequestStatus[],
    reason: string | null,
  ): Promise<AssistanceRequestRow | null> {
    const { count } = await this.prisma.assistanceRequest.updateMany({
      where: {
        assistance_request_id: requestId,
        status: { in: [...cancellableStatuses] },
      },
      data: {
        status: AssistanceRequestStatus.CANCELLED,
        cancelled_at: new Date(),
        cancel_reason: reason,
      },
    });
    if (count === 0) return null;
    return this.prisma.assistanceRequest.findUnique({
      where: { assistance_request_id: requestId },
      include: requestInclude,
    });
  }

  async findHouseholdSize(userId: string): Promise<number | null> {
    const user = await this.prisma.user.findUnique({
      where: { user_id: userId },
      select: { household_size: true },
    });
    return user?.household_size ?? null;
  }

  async create(
    input: CreateAssistanceRequestInput,
  ): Promise<AssistanceRequestRow> {
    return this.prisma.assistanceRequest.create({
      data: {
        user_id: input.userId,
        ...toFieldData(input),
        household_size: input.householdSize,
        attachments: {
          create: input.attachments.map((file) => ({
            name: file.name,
            url: file.url,
            mime: file.mime,
            size_bytes: file.sizeBytes,
          })),
        },
      },
      include: requestInclude,
    });
  }
}

function toFieldData(fields: AssistanceRequestFieldsInput) {
  return {
    title: fields.title,
    category: fields.category,
    description: fields.description,
    urgency: fields.urgency,
    location_latitude: fields.locationLatitude,
    location_longitude: fields.locationLongitude,
    location_details: fields.locationDetails,
  };
}
