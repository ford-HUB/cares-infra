import { Module } from '@nestjs/common';
import { RankingsMobileController } from '../controllers/rankings-mobile-controller';
import { RankingsMobileService } from '../services/rankings-mobile-service';
import { RankingsCoreModule } from './rankings-core-module';

@Module({
  imports: [RankingsCoreModule],
  controllers: [RankingsMobileController],
  providers: [RankingsMobileService],
  exports: [RankingsMobileService],
})
export class RankingsMobileModule {}
