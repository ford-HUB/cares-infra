import { Module } from '@nestjs/common';
import { SystemPerformanceSiteModule } from './system-performance-site-module';

@Module({
  imports: [SystemPerformanceSiteModule],
})
export class SystemPerformanceModule {}
