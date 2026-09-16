import { Module } from '@nestjs/common';
import { SchedulersModule } from '../../../schedulers/schedulers.module';
import { SystemDiagnosticsSiteController } from '../controllers/system-diagnostics-site-controller';
import { SystemDiagnosticsSiteService } from '../services/system-diagnostics-site-service';

@Module({
  // The checker and its Redis-kept reports come from the schedulers module.
  imports: [SchedulersModule],
  controllers: [SystemDiagnosticsSiteController],
  providers: [SystemDiagnosticsSiteService],
})
export class SystemDiagnosticsSiteModule {}
