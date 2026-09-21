import { Injectable } from '@nestjs/common';
import type { EvaluationForm } from '../../../infastructures/prisma/common/client';
import type {
  EvaluationAnswersDto,
  EvaluationFormDto,
  EvaluationQuestionDto,
  EvaluationTypographyDto,
} from '../dto/evaluation-site-dto';
import {
  EvaluationQuestionSchema,
  EvaluationTypographySchema,
} from '../validators/evaluation-site-validator';

/**
 * Reads the questionnaire out of its JSON columns. Shared by the portal (which
 * edits it) and the volunteer app (which answers it) so both see the same shape.
 */
@Injectable()
export class EvaluationFormService {
  toDto(form: EvaluationForm): EvaluationFormDto {
    return {
      evaluation_form_id: form.evaluation_form_id,
      title: form.title,
      description: form.description,
      header_typography: this.parseTypography(form.header_typography),
      questions: this.parseQuestions(form.questions),
      status: form.status,
      updated_at: form.updatedAt.toISOString(),
    };
  }

  /**
   * The stored JSON was validated on the way in, so a parse failure here means
   * the column was edited by hand; drop the bad entry rather than 500 the page.
   */
  parseQuestions(raw: unknown): EvaluationQuestionDto[] {
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((entry) => {
      const parsed = EvaluationQuestionSchema.safeParse(entry);
      return parsed.success ? [parsed.data] : [];
    });
  }

  private parseTypography(raw: unknown): EvaluationTypographyDto {
    const parsed = EvaluationTypographySchema.safeParse(raw);
    return parsed.success
      ? parsed.data
      : { font_family: 'inter', font_size: 'xl' };
  }

  /** True when the answer counts as given — the same test the portal uses. */
  isAnswered(value: EvaluationAnswersDto[string] | undefined): boolean {
    if (value === undefined || value === null) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  }
}
