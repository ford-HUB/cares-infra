import { Module } from '@nestjs/common';
import { SystemPerformanceSiteController } from '../controllers/system-performance-site-controller';
import { SystemPerformanceRepository } from '../repositories/system-performance-repository';
import { SystemPerformanceSiteService } from '../services/system-performance-site-service';

@Module({
  // The sampler and request recorder come from the global MetricsModule — this one
  // only reads them and keeps the page timings the portal reports.
  controllers: [SystemPerformanceSiteController],
  providers: [SystemPerformanceSiteService, SystemPerformanceRepository],
})
export class SystemPerformanceSiteModule {}
