import { Module } from '@nestjs/common';
import { SystemPerformanceSiteModule } from './system-performance-site-module';

/** Site-only: the performance screen lives on the admin portal. */
@Module({
  imports: [SystemPerformanceSiteModule],
})
export class SystemPerformanceModule {}
