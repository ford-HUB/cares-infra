import { Global, Module } from '@nestjs/common';
import { AuditLogRepository } from '../repositories/audit-log-repository';
import { AuditLogRecorder } from '../services/audit-log-recorder';
import { AuditLogsMobileModule } from './audit-logs-mobile-module';
import { AuditLogsSiteModule } from './audit-logs-site-module';

/** Global: features across the portal write via the recorder. */
@Global()
@Module({
  imports: [AuditLogsSiteModule, AuditLogsMobileModule],
  providers: [AuditLogRepository, AuditLogRecorder],
  exports: [AuditLogRecorder, AuditLogRepository],
})
export class AuditLogsModule {}
