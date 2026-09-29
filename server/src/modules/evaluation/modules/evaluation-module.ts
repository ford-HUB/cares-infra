import { Module } from '@nestjs/common';
import { EvaluationMobileModule } from './evaluation-mobile-module';
import { EvaluationSiteModule } from './evaluation-site-module';

@Module({
  imports: [EvaluationMobileModule, EvaluationSiteModule],
})
export class EvaluationModule {}
