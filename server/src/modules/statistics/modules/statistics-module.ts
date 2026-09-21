import { Module } from '@nestjs/common';
import { StatisticsSiteModule } from './statistics-site-module';

@Module({ imports: [StatisticsSiteModule] })
export class StatisticsModule {}
