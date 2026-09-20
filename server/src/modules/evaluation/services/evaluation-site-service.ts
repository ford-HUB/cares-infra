import { Injectable } from '@nestjs/common';
import type {
  EvaluationAnswersDto,
  EvaluationFormDto,
  EvaluationResponseRowDto,
  SaveEvaluationFormDto,
} from '../dto/evaluation-site-dto';
import {
  EvaluationRepository,
  type EvaluationResponseRow,
} from '../repositories/evaluation-repository';
import { EvaluationAnswersSchema } from '../validators/evaluation-site-validator';
import { EvaluationFormService } from './evaluation-form-service';

@Injectable()
export class EvaluationSiteService {
  constructor(
    private readonly evaluationRepository: EvaluationRepository,
    private readonly evaluationFormService: EvaluationFormService,
  ) {}

  async getForm(): Promise<EvaluationFormDto> {
    const form = await this.evaluationRepository.findOrCreateForm();
    return this.evaluationFormService.toDto(form);
  }

  /**
   * Replaces the whole questionnaire. Question ids come from the builder and are
   * kept as-is — earlier answers stay keyed to them, so a question edited in
   * place keeps its history while one deleted and re-added starts fresh.
   */
  async saveForm(data: SaveEvaluationFormDto): Promise<EvaluationFormDto> {
    const current = await this.evaluationRepository.findOrCreateForm();
    const saved = await this.evaluationRepository.updateForm(
      current.evaluation_form_id,
      {
        title: data.title,
        description: data.description,
        header_typography: data.header_typography,
        questions: data.questions,
        status: data.status,
      },
    );
    return this.evaluationFormService.toDto(saved);
  }

  /**
   * Every submitted response, or one event's. The portal loads them once and
   * searches, filters and pages client-side, the same as the attendees roster.
   */
  async listResponses(eventId?: number): Promise<EvaluationResponseRowDto[]> {
    const rows = await this.evaluationRepository.findResponses(eventId);
    return rows.map((row) => this.mapToDto(row));
  }

  private mapToDto(row: EvaluationResponseRow): EvaluationResponseRowDto {
    return {
      evaluation_response_id: row.evaluation_response_id,
      event_id: row.event.event_id,
      event_title: row.event.title,
      user_id: row.user.user_id,
      firstname: row.user.firstname,
      lastname: row.user.lastname,
      email: row.user.accounts[0]?.email ?? '',
      department: row.user.user_school_info[0]?.department.name ?? null,
      submitted_at: row.submitted_at.toISOString(),
      rating: row.rating,
      status: row.status,
      answers: this.parseAnswers(row.answers),
    };
  }

  private parseAnswers(raw: unknown): EvaluationAnswersDto {
    const parsed = EvaluationAnswersSchema.safeParse(raw);
    return parsed.success ? parsed.data : {};
  }
}
