import { Module } from '@nestjs/common';
import { AuditLogsMobileController } from '../controllers/audit-logs-mobile-controller';
import { AuditLogRepository } from '../repositories/audit-log-repository';
import { AuditLogRecorder } from '../services/audit-log-recorder';
import { AuditLogsMobileService } from '../services/audit-logs-mobile-service';

@Module({
  controllers: [AuditLogsMobileController],
  providers: [AuditLogsMobileService, AuditLogRepository, AuditLogRecorder],
})
export class AuditLogsMobileModule {}
