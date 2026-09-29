import { Module } from '@nestjs/common';
import { MonthlyReportsSiteModule } from './monthly-reports-site-module';

/**
 * Site-only: reports are submitted from the portal and decided there. The Flutter app
 * has no reporting screen, so there is no mobile half to wire up.
 */
@Module({
  imports: [MonthlyReportsSiteModule],
  exports: [MonthlyReportsSiteModule],
})
export class MonthlyReportsModule {}
