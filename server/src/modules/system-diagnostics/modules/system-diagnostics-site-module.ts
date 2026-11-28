import { Module } from '@nestjs/common';
import { SchedulersModule } from '../../../schedulers/schedulers-module';
import { SystemDiagnosticsSiteController } from '../controllers/system-diagnostics-site-controller';
import { SystemDiagnosticsSiteService } from '../services/system-diagnostics-site-service';

@Module({
  // Checker and Redis reports come from the schedulers module.
  imports: [SchedulersModule],
  controllers: [SystemDiagnosticsSiteController],
  providers: [SystemDiagnosticsSiteService],
})
export class SystemDiagnosticsSiteModule {}
