import { Module } from '@nestjs/common';
import { AuditLogsSiteController } from '../controllers/audit-logs-site-controller';
import { AuditLogRepository } from '../repositories/audit-log-repository';
import { AuditLogsSiteService } from '../services/audit-logs-site-service';

@Module({
  controllers: [AuditLogsSiteController],
  providers: [AuditLogsSiteService, AuditLogRepository],
  exports: [AuditLogsSiteService, AuditLogRepository],
})
export class AuditLogsSiteModule {}
