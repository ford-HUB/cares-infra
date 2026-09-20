import { Module } from '@nestjs/common';
import { EvaluationSiteController } from '../controllers/evaluation-site-controller';
import { EvaluationSiteService } from '../services/evaluation-site-service';
import { EvaluationCoreModule } from './evaluation-core-module';

@Module({
  imports: [EvaluationCoreModule],
  controllers: [EvaluationSiteController],
  providers: [EvaluationSiteService],
  exports: [EvaluationSiteService],
})
export class EvaluationSiteModule {}
