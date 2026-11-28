import { Module } from '@nestjs/common';
import { MonthlyReportsSiteModule } from './monthly-reports-site-module';

/** Site-only: no mobile reporting screen. */
@Module({
  imports: [MonthlyReportsSiteModule],
  exports: [MonthlyReportsSiteModule],
})
export class MonthlyReportsModule {}
