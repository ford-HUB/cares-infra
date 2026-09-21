import { Module } from '@nestjs/common';
import { StatisticsSiteController } from '../controllers/statistics-site-controller';
import { StatisticsRepository } from '../repositories/statistics-repository';
import { StatisticsSiteService } from '../services/statistics-site-service';

@Module({
  controllers: [StatisticsSiteController],
  providers: [StatisticsSiteService, StatisticsRepository],
})
export class StatisticsSiteModule {}
