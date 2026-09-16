import { Module } from '@nestjs/common';
import { OverviewSiteModule } from './overview-site-module';

@Module({ imports: [OverviewSiteModule] })
export class OverviewModule {}
