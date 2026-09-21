import { Module } from '@nestjs/common';
import { RankingsMobileModule } from './rankings-mobile-module';
import { RankingsSiteModule } from './rankings-site-module';

@Module({
  imports: [RankingsMobileModule, RankingsSiteModule],
})
export class RankingsModule {}
