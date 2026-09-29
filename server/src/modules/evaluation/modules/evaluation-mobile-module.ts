import { Module } from '@nestjs/common';
import { EvaluationMobileController } from '../controllers/evaluation-mobile-controller';
import { EvaluationMobileService } from '../services/evaluation-mobile-service';
import { EvaluationCoreModule } from './evaluation-core-module';

@Module({
  imports: [EvaluationCoreModule],
  controllers: [EvaluationMobileController],
  providers: [EvaluationMobileService],
  exports: [EvaluationMobileService],
})
export class EvaluationMobileModule {}
