import { Global, Module } from '@nestjs/common';
import { AuditLogRepository } from '../repositories/audit-log-repository';
import { AuditLogRecorder } from '../services/audit-log-recorder';
import { AuditLogsMobileModule } from './audit-logs-mobile-module';
import { AuditLogsSiteModule } from './audit-logs-site-module';

/**
 * Global, and exports the recorder: reading the trail belongs to this feature, but the
 * writes happen inside whichever feature performed the privileged action, and those
 * are spread across the portal.
 */
@Global()
@Module({
  imports: [AuditLogsSiteModule, AuditLogsMobileModule],
  providers: [AuditLogRepository, AuditLogRecorder],
  exports: [AuditLogRecorder, AuditLogRepository],
})
export class AuditLogsModule {}
