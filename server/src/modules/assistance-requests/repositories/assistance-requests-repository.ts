import { Injectable } from '@nestjs/common';
import {
  AssistanceRequestStatus,
  Prisma,
  type AssistanceCategory,
  type AssistanceUrgency,
} from '../../../infastructures/prisma/common/client';
import { PrismaService } from '../../../infastructures/prisma/prisma-service';

/** The fields a beneficiary fills in — set when filing, changed by an edit. */
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

/** The portal's view also needs who filed it. */
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

/** A staff move on a request: the status it lands in and the stage stamps. */
export interface AssistanceTransitionInput {
  status: AssistanceRequestStatus;
  screenedAt?: Date;
  decidedAt?: Date;
  releasedAt?: Date;
  /** Undefined leaves the existing note as it is. */
  statusNote?: string | null;
}

@Injectable()
export class AssistanceRequestsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Every request, newest first — the portal groups them by day. */
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

  /**
   * Moves the request only while it is still in one of [fromStatuses], so a
   * beneficiary's edit or cancel landing first wins. Null when it moved on.
   */
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

  /** One of the user's own requests; null when it is not theirs or is gone. */
  async findForUser(
    userId: string,
    requestId: string,
  ): Promise<AssistanceRequestRow | null> {
    return this.prisma.assistanceRequest.findFirst({
      where: { assistance_request_id: requestId, user_id: userId },
      include: requestInclude,
    });
  }

  /**
   * Applies an edit only while the request is still in [editableStatus] and
   * unscreened, so a staff action landing between the read and this write
   * wins. Null when that guard no longer holds.
   */
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

  /**
   * Withdraws the request while it is still in one of [cancellableStatuses].
   * Null when it moved on (e.g. was completed) in the meantime.
   */
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

  /** The household size saved on the beneficiary's profile, if any. */
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
