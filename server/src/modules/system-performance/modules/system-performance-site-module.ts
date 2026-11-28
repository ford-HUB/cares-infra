import { Module } from '@nestjs/common';
import { SystemPerformanceSiteController } from '../controllers/system-performance-site-controller';
import { SystemPerformanceRepository } from '../repositories/system-performance-repository';
import { SystemPerformanceSiteService } from '../services/system-performance-site-service';

@Module({
  // Sampler and recorder come from the global MetricsModule.
  controllers: [SystemPerformanceSiteController],
  providers: [SystemPerformanceSiteService, SystemPerformanceRepository],
})
export class SystemPerformanceSiteModule {}
