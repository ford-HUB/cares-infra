import { Controller, Get } from '@nestjs/common';
import { ZQuery, ZSerialize } from 'nest-zod';
import { RoleType } from 'src/infastructures/prisma/common/client';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import type {
  AuditLogPageDto,
  ListAuditLogsQueryDto,
} from '../dto/audit-logs-site-dto';
import { AuditLogsSiteService } from '../services/audit-logs-site-service';
import {
  AuditLogPageResponseSchema,
  ListAuditLogsQuerySchema,
} from '../validators/audit-logs-site-validator';

/** The trail records what every administrator did, so reading it stays admin-only. */
@Controller('v1/audit-logs')
@Roles(RoleType.ADMIN)
export class AuditLogsSiteController {
  constructor(private readonly auditLogsSiteService: AuditLogsSiteService) {}

  @Get()
  @ResponseMessage('Audit logs')
  @ZSerialize(AuditLogPageResponseSchema)
  async listLogs(
    @ZQuery(ListAuditLogsQuerySchema) query: ListAuditLogsQueryDto,
  ): Promise<AuditLogPageDto> {
    return this.auditLogsSiteService.listLogs(query);
  }
}
