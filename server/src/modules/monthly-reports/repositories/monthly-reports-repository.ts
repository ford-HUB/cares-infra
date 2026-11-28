import { Injectable } from '@nestjs/common';
import {
  Prisma,
  type MonthlyReportDocumentKind,
  type MonthlyReportStatus,
  type MonthlyReportTrailAction,
  type ReportDepartment,
} from '../../../infastructures/prisma/common/client';
import { PrismaService } from '../../../infastructures/prisma/prisma-service';

export interface ListMonthlyReportsInput {
  status: MonthlyReportStatus | 'all';
  department: ReportDepartment | 'all';
  /** `YYYY-MM`, or `all`. */
  period: string;
  limit: number;
}

export interface CreateMonthlyReportInput {
  reference: string;
  title: string;
  period: string;
  department: ReportDepartment;
  summary: string;
  metrics: {
    events: number;
    volunteers: number;
    serviceHours: number;
    beneficiaries: number;
  };
  submittedByUserId: string;
  submittedByName: string;
  submittedByEmail: string;
  submittedByTitle: string;
}

export interface CreateReportDocumentInput {
  fileName: string;
  kind: MonthlyReportDocumentKind;
  storageKey: string;
  contentType: string;
  byteSize: number;
}

export interface DecideMonthlyReportInput {
  status: MonthlyReportStatus;
  reviewerUserId: string;
  reviewerName: string;
  note?: string;
  trailAction: MonthlyReportTrailAction;
}

const reportInclude = {
  documents: { orderBy: { createdAt: 'asc' } },
  trail: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.MonthlyReportInclude;

export type MonthlyReportRow = Prisma.MonthlyReportGetPayload<{
  include: typeof reportInclude;
}>;

const folderInclude = {
  reports: {
    select: { monthly_report_id: true },
    orderBy: { updatedAt: 'desc' },
  },
} satisfies Prisma.MonthlyReportFolderInclude;

export type ReportFolderRow = Prisma.MonthlyReportFolderGetPayload<{
  include: typeof folderInclude;
}>;

@Injectable()
export class MonthlyReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listReports(input: ListMonthlyReportsInput) {
    const where: Prisma.MonthlyReportWhereInput = {
      ...(input.status === 'all' ? {} : { status: input.status }),
      ...(input.department === 'all' ? {} : { department: input.department }),
      ...(input.period === 'all' ? {} : { period: input.period }),
    };

    // Concurrent reads; a capped read needs no transaction.
    const [rows, total] = await Promise.all([
      this.prisma.monthlyReport.findMany({
        where,
        include: reportInclude,
        orderBy: [{ period: 'desc' }, { updatedAt: 'desc' }],
        take: input.limit,
      }),
      this.prisma.monthlyReport.count({ where }),
    ]);

    return { rows, total };
  }

  async findReport(id: string): Promise<MonthlyReportRow | null> {
    return this.prisma.monthlyReport.findUnique({
      where: { monthly_report_id: id },
      include: reportInclude,
    });
  }

  async findDocument(reportId: string, documentId: string) {
    return this.prisma.monthlyReportDocument.findFirst({
      where: {
        monthly_report_document_id: documentId,
        monthly_report_id: reportId,
      },
    });
  }

  /** `MR-2026-014`: sequence restarts yearly. */
  async highestReferenceSequence(year: number): Promise<number> {
    const latest = await this.prisma.monthlyReport.findFirst({
      where: { reference: { startsWith: `MR-${year}-` } },
      orderBy: { reference: 'desc' },
      select: { reference: true },
    });

    if (!latest) return 0;

    const sequence = Number(latest.reference.split('-')[2]);
    return Number.isFinite(sequence) ? sequence : 0;
  }

  /** Written together with its opening trail entry. */
  async createReport(
    input: CreateMonthlyReportInput,
  ): Promise<MonthlyReportRow> {
    return this.prisma.monthlyReport.create({
      data: {
        reference: input.reference,
        title: input.title,
        period: input.period,
        department: input.department,
        summary: input.summary,
        metric_events: input.metrics.events,
        metric_volunteers: input.metrics.volunteers,
        metric_service_hours: input.metrics.serviceHours,
        metric_beneficiaries: input.metrics.beneficiaries,
        submitted_by_user_id: input.submittedByUserId,
        submitted_by_name: input.submittedByName,
        submitted_by_email: input.submittedByEmail,
        submitted_by_title: input.submittedByTitle,
        trail: {
          create: {
            action: 'SUBMITTED',
            actor_name: input.submittedByName,
          },
        },
      },
      include: reportInclude,
    });
  }

  async createDocuments(
    reportId: string,
    documents: CreateReportDocumentInput[],
  ): Promise<void> {
    await this.prisma.monthlyReportDocument.createMany({
      data: documents.map((document) => ({
        monthly_report_id: reportId,
        file_name: document.fileName,
        kind: document.kind,
        storage_key: document.storageKey,
        content_type: document.contentType,
        byte_size: document.byteSize,
      })),
    });
  }

  async deleteReport(id: string): Promise<void> {
    await this.prisma.monthlyReport.delete({
      where: { monthly_report_id: id },
    });
  }

  /** Decision and trail entry in one write. */
  async decideReport(
    id: string,
    input: DecideMonthlyReportInput,
  ): Promise<MonthlyReportRow> {
    return this.prisma.monthlyReport.update({
      where: { monthly_report_id: id },
      data: {
        status: input.status,
        reviewer_user_id: input.reviewerUserId,
        reviewer_name: input.reviewerName,
        decided_at: new Date(),
        decision_note: input.note ?? null,
        trail: {
          create: {
            action: input.trailAction,
            actor_name: input.reviewerName,
            note: input.note ?? null,
          },
        },
      },
      include: reportInclude,
    });
  }

  async moveReport(
    id: string,
    folderId: string | null,
  ): Promise<MonthlyReportRow> {
    return this.prisma.monthlyReport.update({
      where: { monthly_report_id: id },
      data: { folder_id: folderId },
      include: reportInclude,
    });
  }

  async listFolders(): Promise<ReportFolderRow[]> {
    return this.prisma.monthlyReportFolder.findMany({
      include: folderInclude,
      orderBy: { createdAt: 'asc' },
    });
  }

  async findFolder(id: string): Promise<ReportFolderRow | null> {
    return this.prisma.monthlyReportFolder.findUnique({
      where: { monthly_report_folder_id: id },
      include: folderInclude,
    });
  }

  async createFolder(
    name: string,
    createdByUserId: string,
    createdByName: string,
  ): Promise<ReportFolderRow> {
    return this.prisma.monthlyReportFolder.create({
      data: {
        name,
        created_by_user_id: createdByUserId,
        created_by_name: createdByName,
      },
      include: folderInclude,
    });
  }

  async renameFolder(id: string, name: string): Promise<ReportFolderRow> {
    return this.prisma.monthlyReportFolder.update({
      where: { monthly_report_folder_id: id },
      data: { name },
      include: folderInclude,
    });
  }

  /** Reports fall back to their derived college folder via the schema's `SetNull`. */
  async deleteFolder(id: string): Promise<void> {
    await this.prisma.monthlyReportFolder.delete({
      where: { monthly_report_folder_id: id },
    });
  }

  /** Read from DB: the JWT carries no name. */
  async findUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        firstname: true,
        lastname: true,
        portal_department: true,
        accounts: { select: { email: true }, take: 1 },
        role: { select: { type: true } },
      },
    });
  }
}
