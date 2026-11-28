import { Module } from '@nestjs/common';
import { RankingsRepository } from '../repositories/rankings-repository';
import { RankingsBoardService } from '../services/rankings-board-service';

@Module({
  providers: [RankingsBoardService, RankingsRepository],
  exports: [RankingsBoardService, RankingsRepository],
})
export class RankingsCoreModule {}
