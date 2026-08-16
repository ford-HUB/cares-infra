import { Module } from '@nestjs/common';
import { InterestsMobileModule } from './interests-mobile-module';

@Module({
  imports: [InterestsMobileModule],
  exports: [InterestsMobileModule],
})
export class InterestsModule {}
