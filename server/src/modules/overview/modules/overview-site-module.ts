import { Module } from '@nestjs/common';
import { OverviewSiteController } from '../controllers/overview-site-controller';
import { OverviewRepository } from '../repositories/overview-repository';
import { OverviewSiteService } from '../services/overview-site-service';

@Module({
  controllers: [OverviewSiteController],
  providers: [OverviewSiteService, OverviewRepository],
})
export class OverviewSiteModule {}
