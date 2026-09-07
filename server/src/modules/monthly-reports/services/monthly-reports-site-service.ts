import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import {
  MonthlyReportDocumentKind,
  MonthlyReportStatus,
  MonthlyReportTrailAction,
} from '../../../infastructures/prisma/common/client';
import { S3Service } from '../../../infastructures/s3/s3-service';
import type { JwtPayload } from '../../../shared/types/jwt-payload';
import type {
  CreateReportFolderDto,
  DecideMonthlyReportDto,
  DeleteReportFolderDto,
  ListMonthlyReportsQueryDto,
  MonthlyReportDto,
  MonthlyReportListDto,
  MoveMonthlyReportDto,
  RenameReportFolderDto,
  ReportFolderDto,
  ReportFolderListDto,
  SubmitMonthlyReportDto,
} from '../dto/monthly-reports-site-dto';
import {
  MonthlyReportsRepository,
  type CreateReportDocumentInput,
  type MonthlyReportRow,
  type ReportFolderRow,
} from '../repositories/monthly-reports-repository';

/** What a coordinator may attach, and what the portal knows how to label. */
const DOCUMENT_KINDS: { mimes: string[]; kind: MonthlyReportDocumentKind }[] = [
  {
    kind: MonthlyReportDocumentKind.PDF,
    mimes: ['application/pdf'],
  },
  {
    kind: MonthlyReportDocumentKind.DOCX,
    mimes: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ],
  },
  {
    kind: MonthlyReportDocumentKind.XLSX,
    mimes: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ],
  },
  {
    kind: MonthlyReportDocumentKind.IMAGE,
    mimes: ['image/png', 'image/jpeg', 'image/webp'],
  },
];

/** A narrative plus its annexes; anything larger is a packet, not a report. */
const DOCUMENT_MAX_BYTES = 15 * 1024 * 1024;

@Injectable()
export class MonthlyReportsSiteService {
  private readonly logger = new Logger(MonthlyReportsSiteService.name);

  constructor(
    private readonly repository: MonthlyReportsRepository,
    private readonly s3Service: S3Service,
  ) {}

  async listReports(
    query: ListMonthlyReportsQueryDto,
  ): Promise<MonthlyReportListDto> {
    const { rows, total } = await this.repository.listReports({
      status: query.status,
      department: query.department,
      period: query.period,
      limit: query.limit,
    });

    return { items: rows.map(toMonthlyReport), total };
  }

  /**
   * A submission arrives whole — figures, narrative and files in one body. The row is
   * written first so the attachments have an id to hang off; if any file fails to
   * store, the whole submission is rolled back rather than left as a report whose
   * annexes are missing.
   */
  async submitReport(
    caller: JwtPayload,
    data: SubmitMonthlyReportDto,
  ): Promise<MonthlyReportDto> {
    const author = await this.repository.findUser(caller.sub);
    if (!author) {
      throw new NotFoundException('Signed-in account not found');
    }

    const reference = await this.nextReference();
    const report = await this.repository.createReport({
      reference,
      title: data.title,
      period: data.period,
      department: data.department,
      summary: data.summary,
      metrics: {
        events: data.metrics.events,
        volunteers: data.metrics.volunteers,
        serviceHours: data.metrics.service_hours,
        beneficiaries: data.metrics.beneficiaries,
      },
      submittedByUserId: caller.sub,
      submittedByName: `${author.firstname} ${author.lastname}`,
      submittedByEmail: author.accounts[0]?.email ?? '',
      submittedByTitle:
        author.portal_department?.trim() ||
        `${data.department} Volunteer Coordinator`,
    });

    const stored: CreateReportDocumentInput[] = [];
    try {
      for (const document of data.documents) {
        stored.push(
          await this.storeDocument(
            report.monthly_report_id,
            document.file_name,
            document.content,
          ),
        );
      }
      await this.repository.createDocuments(report.monthly_report_id, stored);
    } catch (error) {
      await this.discardSubmission(report.monthly_report_id, stored);
      throw error;
    }

    return toMonthlyReport(await this.requireReport(report.monthly_report_id));
  }

  /**
   * The decision the whole queue exists for. Approving files the report under its
   * college; returning sends it back with the note, which is the only thing the
   * coordinator gets to act on.
   */
  async decideReport(
    id: string,
    caller: JwtPayload,
    decision: DecideMonthlyReportDto,
  ): Promise<MonthlyReportDto> {
    const report = await this.requireReport(id);
    if (report.status === MonthlyReportStatus.APPROVED) {
      throw new BadRequestException(
        `${report.reference} has already been approved`,
      );
    }

    const reviewer = await this.repository.findUser(caller.sub);
    if (!reviewer) {
      throw new NotFoundException('Signed-in account not found');
    }

    const row = await this.repository.decideReport(id, {
      status: decision.decision,
      reviewerUserId: caller.sub,
      reviewerName: `${reviewer.firstname} ${reviewer.lastname}`,
      note: decision.note,
      trailAction:
        decision.decision === MonthlyReportStatus.APPROVED
          ? MonthlyReportTrailAction.APPROVED
          : MonthlyReportTrailAction.RETURNED,
    });

    return toMonthlyReport(row);
  }

  /**
   * Filing is only ever a move between shelves, so a report that has not been approved
   * yet cannot be filed — it still belongs to the queue.
   */
  async moveReport(
    id: string,
    move: MoveMonthlyReportDto,
  ): Promise<MonthlyReportDto> {
    const report = await this.requireReport(id);
    if (report.status !== MonthlyReportStatus.APPROVED) {
      throw new BadRequestException(
        'Only an approved report can be filed in a folder',
      );
    }

    if (move.folder_id) {
      await this.requireFolder(move.folder_id);
    }

    return toMonthlyReport(
      await this.repository.moveReport(id, move.folder_id),
    );
  }

  async listFolders(): Promise<ReportFolderListDto> {
    const rows = await this.repository.listFolders();
    return { items: rows.map(toReportFolder) };
  }

  async createFolder(
    caller: JwtPayload,
    data: CreateReportFolderDto,
  ): Promise<ReportFolderDto> {
    const author = await this.repository.findUser(caller.sub);
    if (!author) {
      throw new NotFoundException('Signed-in account not found');
    }

    const row = await this.repository.createFolder(
      data.name,
      caller.sub,
      `${author.firstname} ${author.lastname}`,
    );

    return toReportFolder(row);
  }

  async renameFolder(
    id: string,
    data: RenameReportFolderDto,
  ): Promise<ReportFolderDto> {
    await this.requireFolder(id);
    return toReportFolder(await this.repository.renameFolder(id, data.name));
  }

  async deleteFolder(id: string): Promise<DeleteReportFolderDto> {
    await this.requireFolder(id);
    await this.repository.deleteFolder(id);
    return { monthly_report_folder_id: id };
  }

  /**
   * Attachments sit in a private bucket, so the portal reads them through here rather
   * than from a stored S3 URL. A content-hash ETag plus `no-cache` lets the browser
   * revalidate instead of re-downloading a report every time the viewer is reopened.
   */
  async getDocument(
    reportId: string,
    documentId: string,
  ): Promise<{
    buffer: Buffer;
    contentType: string;
    fileName: string;
    etag: string;
  }> {
    const document = await this.repository.findDocument(reportId, documentId);
    if (!document) {
      throw new NotFoundException('Report document not found');
    }

    const object = await this.s3Service.getObject(document.storage_key);

    return {
      buffer: object.buffer,
      contentType: document.content_type || object.contentType,
      fileName: document.file_name,
      etag: `"${createHash('sha1').update(object.buffer).digest('hex')}"`,
    };
  }

  /**
   * `MR-2026-014`. Read-then-write rather than a database sequence, so the reference
   * stays readable and restarts each January.
   */
  private async nextReference(): Promise<string> {
    const year = new Date().getFullYear();
    const highest = await this.repository.highestReferenceSequence(year);
    return `MR-${year}-${String(highest + 1).padStart(3, '0')}`;
  }

  /** Decodes one `data:` URL, checks what it is, and puts the bytes in the bucket. */
  private async storeDocument(
    reportId: string,
    fileName: string,
    dataUrl: string,
  ): Promise<CreateReportDocumentInput> {
    const match = /^data:([^;,]+);base64,(.+)$/s.exec(dataUrl);
    if (!match) {
      throw new BadRequestException(
        `${fileName} could not be read — attach it again`,
      );
    }

    const [, contentType, encoded] = match;
    const buffer = Buffer.from(encoded, 'base64');

    if (buffer.length === 0) {
      throw new BadRequestException(`${fileName} is empty`);
    }
    if (buffer.length > DOCUMENT_MAX_BYTES) {
      throw new BadRequestException(
        `Each attached file must be ${Math.round(
          DOCUMENT_MAX_BYTES / (1024 * 1024),
        )} MB or smaller`,
      );
    }

    const kind = DOCUMENT_KINDS.find((entry) =>
      entry.mimes.includes(contentType),
    )?.kind;

    if (!kind) {
      throw new BadRequestException(
        `${fileName} is not a Word, PDF, Excel or image file`,
      );
    }

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-64);
    const key = `monthly-reports/${reportId}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}-${safeName}`;

    await this.s3Service.uploadToS3(key, buffer, contentType);

    return {
      fileName,
      kind,
      storageKey: key,
      contentType,
      byteSize: buffer.length,
    };
  }

  /**
   * Undoes a half-stored submission. The row goes first — that is what the portal
   * would otherwise show — and the objects are best effort, since a leaked file costs
   * storage while a phantom report costs a director's trust in the queue.
   */
  private async discardSubmission(
    reportId: string,
    stored: CreateReportDocumentInput[],
  ): Promise<void> {
    try {
      await this.repository.deleteReport(reportId);
    } catch (error) {
      this.logger.error(
        `Failed to discard monthly report ${reportId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    for (const document of stored) {
      try {
        await this.s3Service.deleteFromS3(document.storageKey);
      } catch (error) {
        this.logger.warn(
          `Failed to remove report attachment ${document.storageKey}: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
      }
    }
  }

  private async requireReport(id: string): Promise<MonthlyReportRow> {
    const report = await this.repository.findReport(id);
    if (!report) {
      throw new NotFoundException('Monthly report not found');
    }
    return report;
  }

  private async requireFolder(id: string): Promise<ReportFolderRow> {
    const folder = await this.repository.findFolder(id);
    if (!folder) {
      throw new NotFoundException('Folder not found');
    }
    return folder;
  }
}

export function toMonthlyReport(row: MonthlyReportRow): MonthlyReportDto {
  return {
    monthly_report_id: row.monthly_report_id,
    reference: row.reference,
    title: row.title,
    period: row.period,
    department: row.department,
    status: row.status,
    summary: row.summary,
    metrics: {
      events: row.metric_events,
      volunteers: row.metric_volunteers,
      service_hours: row.metric_service_hours,
      beneficiaries: row.metric_beneficiaries,
    },
    submitted_by_user_id: row.submitted_by_user_id,
    submitted_by_name: row.submitted_by_name,
    submitted_by_email: row.submitted_by_email,
    submitted_by_title: row.submitted_by_title,
    submitted_at: row.submitted_at.toISOString(),
    reviewer_name: row.reviewer_name,
    decided_at: row.decided_at?.toISOString() ?? null,
    decision_note: row.decision_note,
    folder_id: row.folder_id,
    documents: row.documents.map((document) => ({
      monthly_report_document_id: document.monthly_report_document_id,
      file_name: document.file_name,
      kind: document.kind,
      content_type: document.content_type,
      byte_size: document.byte_size,
      uploaded_at: document.createdAt.toISOString(),
      url: `/api/v1/monthly-reports/${row.monthly_report_id}/documents/${document.monthly_report_document_id}`,
    })),
    trail: row.trail.map((entry) => ({
      monthly_report_trail_entry_id: entry.monthly_report_trail_entry_id,
      action: entry.action,
      actor_name: entry.actor_name,
      note: entry.note,
      created_at: entry.createdAt.toISOString(),
    })),
    updated_at: row.updatedAt.toISOString(),
  };
}

export function toReportFolder(row: ReportFolderRow): ReportFolderDto {
  return {
    monthly_report_folder_id: row.monthly_report_folder_id,
    name: row.name,
    created_by_name: row.created_by_name,
    created_at: row.createdAt.toISOString(),
    report_ids: row.reports.map((report) => report.monthly_report_id),
  };
}
