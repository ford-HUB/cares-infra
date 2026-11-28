import { Module } from '@nestjs/common';
import { EvaluationRepository } from '../repositories/evaluation-repository';
import { EvaluationFormService } from '../services/evaluation-form-service';

@Module({
  providers: [EvaluationFormService, EvaluationRepository],
  exports: [EvaluationFormService, EvaluationRepository],
})
export class EvaluationCoreModule {}
