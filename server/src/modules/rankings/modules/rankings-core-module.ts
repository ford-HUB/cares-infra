import { Module } from '@nestjs/common';
import { RankingsRepository } from '../repositories/rankings-repository';
import { RankingsBoardService } from '../services/rankings-board-service';

/** The scorer and its repository, shared by both client sides. */
@Module({
  providers: [RankingsBoardService, RankingsRepository],
  exports: [RankingsBoardService, RankingsRepository],
})
export class RankingsCoreModule {}
