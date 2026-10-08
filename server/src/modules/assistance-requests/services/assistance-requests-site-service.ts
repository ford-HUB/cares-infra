import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssistanceRequestStatus,
  NotificationCategory,
  NotificationTone,
  RoleType,
} from '../../../infastructures/prisma/common/client';
import { S3Service } from '../../../infastructures/s3/s3-service';
import { NotificationScheduler } from '../../../schedulers/jobs/notification-scheduler';
import type {
  ApproveAssistanceRequestDto,
  DeclineAssistanceRequestDto,
  SiteAssistanceRequestDto,
  SiteAssistanceRequestListDto,
} from '../dto/assistance-requests-site-dto';
import {
  AssistanceRequestsRepository,
  type AssistanceTransitionInput,
  type SiteAssistanceRequestRow,
} from '../repositories/assistance-requests-repository';

const { PENDING, UNDER_REVIEW, APPROVED, COMPLETED, DECLINED } =
  AssistanceRequestStatus;

/** The relief desk's moves, and the statuses each one may start from. */
const TRANSITION_FROM = {
  review: [PENDING],
  approve: [PENDING, UNDER_REVIEW],
  decline: [PENDING, UNDER_REVIEW],
  complete: [APPROVED],
} as const satisfies Record<string, readonly AssistanceRequestStatus[]>;

type Transition = keyof typeof TRANSITION_FROM;

/**
 * Director-side review of beneficiaries' assistance requests. Each move
 * stamps the stage the beneficiary's progress trail is drawn from, and tells
 * them in the app.
 */
@Injectable()
export class AssistanceRequestsSiteService {
  constructor(
    private readonly assistanceRequestsRepository: AssistanceRequestsRepository,
    private readonly s3Service: S3Service,
    private readonly notificationScheduler: NotificationScheduler,
  ) {}

  async list(): Promise<SiteAssistanceRequestListDto> {
    const rows = await this.assistanceRequestsRepository.listAll();
    return { items: rows.map(toSiteDto) };
  }

  async getAttachment(requestId: string, attachmentId: string) {
    const attachment = await this.assistanceRequestsRepository.findAttachment(
      requestId,
      attachmentId,
    );
    if (!attachment) throw new NotFoundException('Attachment not found');
    const object = await this.s3Service.getObject(attachment.url);
    return {
      buffer: object.buffer,
      contentType: attachment.mime || object.contentType,
    };
  }

  /** Screening has started — the beneficiary can no longer edit it. */
  async review(id: string): Promise<SiteAssistanceRequestDto> {
    return this.move(id, 'review', (row) => ({
      status: UNDER_REVIEW,
      screenedAt: row.screened_at ?? new Date(),
    }));
  }

  async approve(
    id: string,
    body: ApproveAssistanceRequestDto,
  ): Promise<SiteAssistanceRequestDto> {
    const now = new Date();
    return this.move(id, 'approve', (row) => ({
      status: APPROVED,
      screenedAt: row.screened_at ?? now,
      decidedAt: now,
      statusNote: body.note?.trim() || null,
    }));
  }

  async decline(
    id: string,
    body: DeclineAssistanceRequestDto,
  ): Promise<SiteAssistanceRequestDto> {
    const now = new Date();
    return this.move(id, 'decline', (row) => ({
      status: DECLINED,
      screenedAt: row.screened_at ?? now,
      decidedAt: now,
      statusNote: body.reason.trim(),
    }));
  }

  /** The assistance was handed over. */
  async complete(id: string): Promise<SiteAssistanceRequestDto> {
    return this.move(id, 'complete', () => ({
      status: COMPLETED,
      releasedAt: new Date(),
    }));
  }

  private async move(
    id: string,
    transition: Transition,
    build: (row: SiteAssistanceRequestRow) => AssistanceTransitionInput,
  ): Promise<SiteAssistanceRequestDto> {
    const row = await this.assistanceRequestsRepository.findByIdForSite(id);
    if (!row) throw new NotFoundException('Assistance request not found');

    const from: readonly AssistanceRequestStatus[] =
      TRANSITION_FROM[transition];
    if (!from.includes(row.status)) {
      throw new ConflictException(
        `This request is ${row.status.toLowerCase().replace('_', ' ')} and can no longer be changed this way`,
      );
    }
    const updated = await this.assistanceRequestsRepository.transitionIfIn(
      id,
      from,
      build(row),
    );
    if (!updated) {
      // Usually the beneficiary cancelled it a moment ago.
      throw new ConflictException(
        'This request was just changed by the beneficiary — refresh and try again',
      );
    }
    await this.notifyBeneficiary(updated);
    return toSiteDto(updated);
  }

  private async notifyBeneficiary(row: SiteAssistanceRequestRow) {
    const reference = referenceLabel(row);
    const notice = {
      [UNDER_REVIEW]: {
        title: 'Your assistance request is being reviewed',
        description: `${reference} (${row.title}) is now with the relief desk.`,
        tone: NotificationTone.INFO,
      },
      [APPROVED]: {
        title: 'Your assistance request was approved',
        description:
          row.status_note ??
          `${reference} was approved — we will tell you when and where to claim it.`,
        tone: NotificationTone.INFO,
      },
      [DECLINED]: {
        title: 'Your assistance request was not approved',
        description: `${reference}: ${row.status_note ?? 'No reason was given.'} You may file a new request.`,
        tone: NotificationTone.ATTENTION,
      },
      [COMPLETED]: {
        title: 'Your assistance has been released',
        description: `${reference} (${row.title}) is complete.`,
        tone: NotificationTone.INFO,
      },
    }[row.status as Exclude<typeof row.status, 'PENDING' | 'CANCELLED'>];
    if (!notice) return;

    await this.notificationScheduler.publish({
      ...notice,
      category: NotificationCategory.USER_REQUEST,
      href: `/assistance-requests/${row.assistance_request_id}`,
      userIds: [row.user_id],
      audienceRole: RoleType.BENEFICIARY,
      dedupeKey: `assistance-request:${row.assistance_request_id}:${row.status}`,
    });
  }
}

function iso(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}

function referenceLabel(row: SiteAssistanceRequestRow): string {
  const serial = String(row.reference_number).padStart(4, '0');
  return `CARES-AR-${row.createdAt.getFullYear()}-${serial}`;
}

function toSiteDto(row: SiteAssistanceRequestRow): SiteAssistanceRequestDto {
  return {
    assistance_request_id: row.assistance_request_id,
    reference_number: row.reference_number,
    reference_label: referenceLabel(row),
    requester_id: row.user_id,
    requester_firstname: row.user.firstname,
    requester_lastname: row.user.lastname,
    requester_email: row.user.accounts[0]?.email ?? '',
    requester_role_type: row.user.role.type,
    requester_barangay: row.user.address_barangay,
    title: row.title,
    category: row.category,
    description: row.description,
    urgency: row.urgency,
    household_size: row.household_size,
    location_latitude: row.location_latitude,
    location_longitude: row.location_longitude,
    location_details: row.location_details,
    status: row.status,
    assessment_status: row.assessment_status,
    assessment_date: iso(row.assessment_date),
    status_note: row.status_note,
    attachments: row.attachments.map((file) => ({
      assistance_request_attachment_id: file.assistance_request_attachment_id,
      name: file.name,
      mime: file.mime,
      size_bytes: file.size_bytes,
    })),
    screened_at: iso(row.screened_at),
    decided_at: iso(row.decided_at),
    released_at: iso(row.released_at),
    cancelled_at: iso(row.cancelled_at),
    cancel_reason: row.cancel_reason,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}
