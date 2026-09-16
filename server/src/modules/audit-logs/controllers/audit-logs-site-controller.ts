import { Controller, Get } from '@nestjs/common';
import { ZQuery, ZSerialize } from 'nest-zod';
import { PermissionKey } from 'src/infastructures/prisma/common/client';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import { RequirePermission } from 'src/shared/decorators/require-permission-decorator';
import { PORTAL_ROLE_TYPES } from 'src/shared/constants/portal-role-types';
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
@Roles(...PORTAL_ROLE_TYPES)
@RequirePermission(PermissionKey.SECURITY_AUDIT_VIEW)
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
