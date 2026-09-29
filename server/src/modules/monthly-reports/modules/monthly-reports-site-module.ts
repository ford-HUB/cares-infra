import { Module } from '@nestjs/common';
import { MonthlyReportsSiteController } from '../controllers/monthly-reports-site-controller';
import { MonthlyReportsRepository } from '../repositories/monthly-reports-repository';
import { MonthlyReportsSiteService } from '../services/monthly-reports-site-service';

@Module({
  controllers: [MonthlyReportsSiteController],
  providers: [MonthlyReportsSiteService, MonthlyReportsRepository],
  exports: [MonthlyReportsSiteService, MonthlyReportsRepository],
})
export class MonthlyReportsSiteModule {}
