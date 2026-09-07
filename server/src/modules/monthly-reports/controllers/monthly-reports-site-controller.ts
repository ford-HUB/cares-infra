import {
  Controller,
  Delete,
  Get,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ZBody, ZParam, ZQuery, ZSerialize } from 'nest-zod';
import { RoleType } from 'src/infastructures/prisma/common/client';
import { PORTAL_ROLE_TYPES } from 'src/shared/constants/portal-role-types';
import { CurrentUser } from 'src/shared/decorators/current-user-decorator';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
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
import { MonthlyReportsSiteService } from '../services/monthly-reports-site-service';
import {
  CreateReportFolderSchema,
  DecideMonthlyReportSchema,
  DeleteReportFolderResponseSchema,
  ListMonthlyReportsQuerySchema,
  MonthlyReportDocumentIdParamSchema,
  MonthlyReportFolderIdParamSchema,
  MonthlyReportIdParamSchema,
  MonthlyReportListResponseSchema,
  MonthlyReportResponseSchema,
  MoveMonthlyReportSchema,
  RenameReportFolderSchema,
  ReportFolderListResponseSchema,
  ReportFolderSchema,
  SubmitMonthlyReportSchema,
} from '../validators/monthly-reports-site-validator';

/**
 * Reading the board is open to the portal roles — a coordinator has to see what became
 * of what they sent — while every decision and every shelf is the director's, so the
 * writes narrow to director and admin. Submitting is the coordinator's own half.
 */
@Controller('v1/monthly-reports')
@Roles(...PORTAL_ROLE_TYPES)
export class MonthlyReportsSiteController {
  constructor(
    private readonly monthlyReportsService: MonthlyReportsSiteService,
  ) {}

  @Get()
  @ResponseMessage('Monthly reports')
  @ZSerialize(MonthlyReportListResponseSchema)
  async listReports(
    @ZQuery(ListMonthlyReportsQuerySchema) query: ListMonthlyReportsQueryDto,
  ): Promise<MonthlyReportListDto> {
    return this.monthlyReportsService.listReports(query);
  }

  @Post()
  @Roles(RoleType.COORDINATOR, RoleType.ADMIN)
  @ResponseMessage('Monthly report submitted')
  @ZSerialize(MonthlyReportResponseSchema)
  async submitReport(
    @CurrentUser() caller: JwtPayload,
    @ZBody(SubmitMonthlyReportSchema) data: SubmitMonthlyReportDto,
  ): Promise<MonthlyReportDto> {
    return this.monthlyReportsService.submitReport(caller, data);
  }

  /** Declared before the `:id` routes so `folders` is not read as a report id. */
  @Get('folders')
  @ResponseMessage('Report folders')
  @ZSerialize(ReportFolderListResponseSchema)
  async listFolders(): Promise<ReportFolderListDto> {
    return this.monthlyReportsService.listFolders();
  }

  @Post('folders')
  @Roles(RoleType.ADMIN, RoleType.DIRECTOR)
  @ResponseMessage('Folder created')
  @ZSerialize(ReportFolderSchema)
  async createFolder(
    @CurrentUser() caller: JwtPayload,
    @ZBody(CreateReportFolderSchema) data: CreateReportFolderDto,
  ): Promise<ReportFolderDto> {
    return this.monthlyReportsService.createFolder(caller, data);
  }

  @Patch('folders/:folderId')
  @Roles(RoleType.ADMIN, RoleType.DIRECTOR)
  @ResponseMessage('Folder renamed')
  @ZSerialize(ReportFolderSchema)
  async renameFolder(
    @ZParam('folderId', MonthlyReportFolderIdParamSchema) folderId: string,
    @ZBody(RenameReportFolderSchema) data: RenameReportFolderDto,
  ): Promise<ReportFolderDto> {
    return this.monthlyReportsService.renameFolder(folderId, data);
  }

  @Delete('folders/:folderId')
  @Roles(RoleType.ADMIN, RoleType.DIRECTOR)
  @ResponseMessage('Folder deleted')
  @ZSerialize(DeleteReportFolderResponseSchema)
  async deleteFolder(
    @ZParam('folderId', MonthlyReportFolderIdParamSchema) folderId: string,
  ): Promise<DeleteReportFolderDto> {
    return this.monthlyReportsService.deleteFolder(folderId);
  }

  @Patch(':id/decision')
  @Roles(RoleType.ADMIN, RoleType.DIRECTOR)
  @ResponseMessage('Decision recorded')
  @ZSerialize(MonthlyReportResponseSchema)
  async decideReport(
    @ZParam('id', MonthlyReportIdParamSchema) id: string,
    @CurrentUser() caller: JwtPayload,
    @ZBody(DecideMonthlyReportSchema) data: DecideMonthlyReportDto,
  ): Promise<MonthlyReportDto> {
    return this.monthlyReportsService.decideReport(id, caller, data);
  }

  @Patch(':id/folder')
  @Roles(RoleType.ADMIN, RoleType.DIRECTOR)
  @ResponseMessage('Report filed')
  @ZSerialize(MonthlyReportResponseSchema)
  async moveReport(
    @ZParam('id', MonthlyReportIdParamSchema) id: string,
    @ZBody(MoveMonthlyReportSchema) data: MoveMonthlyReportDto,
  ): Promise<MonthlyReportDto> {
    return this.monthlyReportsService.moveReport(id, data);
  }

  /** Attachments live in a private bucket; the portal reads the bytes through here. */
  @Get(':id/documents/:documentId')
  async getDocument(
    @ZParam('id', MonthlyReportIdParamSchema) id: string,
    @ZParam('documentId', MonthlyReportDocumentIdParamSchema)
    documentId: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile | undefined> {
    const document = await this.monthlyReportsService.getDocument(
      id,
      documentId,
    );

    response.setHeader('ETag', document.etag);
    response.setHeader('Cache-Control', 'private, no-cache');

    if (request.headers['if-none-match'] === document.etag) {
      response.status(HttpStatus.NOT_MODIFIED);
      return undefined;
    }

    return new StreamableFile(document.buffer, {
      type: document.contentType,
      disposition: `inline; filename="${document.fileName.replace(/"/g, '')}"`,
    });
  }
}
