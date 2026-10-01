import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AssistanceAssessmentStatus,
  AssistanceRequestStatus,
} from '../../../infastructures/prisma/common/client';
import { S3Service } from '../../../infastructures/s3/s3-service';
import type {
  AssistanceTimelineEntryDto,
  CreateAssistanceRequestDto,
  MobileAssistanceRequestDto,
  MobileAssistanceRequestListDto,
} from '../dto/assistance-requests-mobile-dto';
import {
  AssistanceRequestsRepository,
  type AssistanceRequestRow,
} from '../repositories/assistance-requests-repository';
import {
  ASSISTANCE_ATTACHMENT_ALLOWED_MIMES,
  ASSISTANCE_ATTACHMENT_MAX_BYTES,
  ASSISTANCE_ATTACHMENT_MAX_COUNT,
} from '../validators/assistance-requests-mobile-validator';

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
};

/** What the app shows under the status when staff have not written a note. */
const STOCK_STATUS_NOTES: Record<AssistanceRequestStatus, string> = {
  PENDING: 'Submitted — waiting for initial screening.',
  UNDER_REVIEW: 'The relief desk is reviewing your request.',
  APPROVED: 'Approved — we will tell you when and where to claim it.',
  COMPLETED: 'Completed — the assistance has been released.',
  DECLINED: 'Not approved this time — you may file a new request.',
};

@Injectable()
export class AssistanceRequestsMobileService {
  constructor(
    private readonly assistanceRequestsRepository: AssistanceRequestsRepository,
    private readonly s3Service: S3Service,
  ) {}

  async listMine(userId: string): Promise<MobileAssistanceRequestListDto> {
    const rows = await this.assistanceRequestsRepository.listForUser(userId);
    return { items: rows.map(toMobileDto) };
  }

  /**
   * Files a request with its proof documents. Every file is checked before
   * any is uploaded, so a bad third file doesn't leave the first two in S3.
   */
  async create(
    userId: string,
    body: CreateAssistanceRequestDto,
    files: Express.Multer.File[],
  ): Promise<MobileAssistanceRequestDto> {
    if (files.length > ASSISTANCE_ATTACHMENT_MAX_COUNT) {
      throw new BadRequestException(
        `You can attach up to ${ASSISTANCE_ATTACHMENT_MAX_COUNT} files`,
      );
    }
    const checked = files.map((file) => ({ file, mime: resolveMime(file) }));
    for (const { file, mime } of checked) {
      if (!file.buffer?.length) {
        throw new BadRequestException(`${file.originalname} is empty`);
      }
      if (file.size > ASSISTANCE_ATTACHMENT_MAX_BYTES) {
        const limitMb = ASSISTANCE_ATTACHMENT_MAX_BYTES / (1024 * 1024);
        throw new BadRequestException(
          `${file.originalname} is larger than ${limitMb} MB`,
        );
      }
      if (
        !(ASSISTANCE_ATTACHMENT_ALLOWED_MIMES as readonly string[]).includes(
          mime,
        )
      ) {
        throw new BadRequestException(
          `${file.originalname} must be a PDF or an image`,
        );
      }
    }

    const attachments = await Promise.all(
      checked.map(async ({ file, mime }, index) => {
        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        const key = `assistance-requests/${userId}/${Date.now()}-${index}-${safeName}`;
        const url = await this.s3Service.uploadToS3(key, file.buffer, mime);
        return { name: file.originalname, url, mime, sizeBytes: file.size };
      }),
    );

    const row = await this.assistanceRequestsRepository.create({
      userId,
      title: body.title,
      category: body.category,
      description: body.description,
      urgency: body.urgency,
      householdSize: body.householdSize,
      attachments,
    });
    return toMobileDto(row);
  }
}

/** Trusts the declared type when it is specific, else the file extension. */
function resolveMime(file: Express.Multer.File): string {
  if (file.mimetype && file.mimetype !== 'application/octet-stream') {
    return file.mimetype === 'image/jpg' ? 'image/jpeg' : file.mimetype;
  }
  const ext = file.originalname.split('.').pop()?.toLowerCase() ?? '';
  return MIME_BY_EXTENSION[ext] ?? file.mimetype;
}

function iso(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}

function referenceLabel(row: AssistanceRequestRow): string {
  const serial = String(row.reference_number).padStart(4, '0');
  return `CARES-AR-${row.createdAt.getFullYear()}-${serial}`;
}

/**
 * The five stages the app draws. A declined request stops at the decision,
 * so it has no release stage.
 */
function buildTimeline(
  row: AssistanceRequestRow,
): AssistanceTimelineEntryDto[] {
  const status = row.status;
  const decided =
    status === AssistanceRequestStatus.APPROVED ||
    status === AssistanceRequestStatus.COMPLETED ||
    status === AssistanceRequestStatus.DECLINED;

  const visitNote = {
    [AssistanceAssessmentStatus.NOT_STARTED]: null,
    [AssistanceAssessmentStatus.SCHEDULED]:
      'A field officer will visit the household.',
    [AssistanceAssessmentStatus.IN_PROGRESS]: 'Assessment ongoing.',
    [AssistanceAssessmentStatus.COMPLETED]: null,
  }[row.assessment_status];

  const timeline: AssistanceTimelineEntryDto[] = [
    {
      label: 'Request submitted',
      date: row.createdAt.toISOString(),
      done: true,
      note: null,
    },
    {
      label: 'Initial screening',
      date: iso(row.screened_at),
      done:
        row.screened_at !== null || status !== AssistanceRequestStatus.PENDING,
      note: null,
    },
    {
      label: 'Needs assessment visit',
      date: iso(row.assessment_date),
      done: row.assessment_status === AssistanceAssessmentStatus.COMPLETED,
      note: visitNote,
    },
    {
      label: 'Approval decision',
      date: iso(row.decided_at),
      done: decided,
      note:
        status === AssistanceRequestStatus.DECLINED ? row.status_note : null,
    },
  ];
  if (status !== AssistanceRequestStatus.DECLINED) {
    timeline.push({
      label: 'Assistance released',
      date: iso(row.released_at),
      done: status === AssistanceRequestStatus.COMPLETED,
      note: null,
    });
  }
  return timeline;
}

function toMobileDto(row: AssistanceRequestRow): MobileAssistanceRequestDto {
  return {
    assistance_request_id: row.assistance_request_id,
    reference_number: row.reference_number,
    reference_label: referenceLabel(row),
    title: row.title,
    category: row.category,
    description: row.description,
    urgency: row.urgency,
    household_size: row.household_size,
    status: row.status,
    assessment_status: row.assessment_status,
    assessment_date: iso(row.assessment_date),
    assigned_organization: row.assigned_organization,
    items: row.items,
    status_note: row.status_note ?? STOCK_STATUS_NOTES[row.status],
    attachments: row.attachments.map((file) => ({
      name: file.name,
      url: file.url,
      mime: file.mime,
      size_bytes: file.size_bytes,
    })),
    timeline: buildTimeline(row),
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}
