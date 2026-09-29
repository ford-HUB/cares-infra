import { Module } from '@nestjs/common';
import { EvaluationRepository } from '../repositories/evaluation-repository';
import { EvaluationFormService } from '../services/evaluation-form-service';

/** The questionnaire reader and its repository, shared by both client sides. */
@Module({
  providers: [EvaluationFormService, EvaluationRepository],
  exports: [EvaluationFormService, EvaluationRepository],
})
export class EvaluationCoreModule {}
