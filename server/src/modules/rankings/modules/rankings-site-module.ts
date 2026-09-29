import { Module } from '@nestjs/common';
import { RankingsSiteController } from '../controllers/rankings-site-controller';
import { RankingsSiteService } from '../services/rankings-site-service';
import { RankingsCoreModule } from './rankings-core-module';

@Module({
  imports: [RankingsCoreModule],
  controllers: [RankingsSiteController],
  providers: [RankingsSiteService],
  exports: [RankingsSiteService],
})
export class RankingsSiteModule {}
