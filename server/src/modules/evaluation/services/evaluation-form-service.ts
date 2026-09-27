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

/** A questionnaire row, with the Forms page's tallies when the query asked for them. */
export type EvaluationFormWithCounts = EvaluationForm & {
  _count?: { assignments: number; responses: number };
};

/**
 * Reads the questionnaire out of its JSON columns. Shared by the portal (which
 * edits it) and the volunteer app (which answers it) so both see the same shape.
 */
@Injectable()
export class EvaluationFormService {
  /**
   * The counts come from the portal's list query; the volunteer app reads a bare
   * row, so they fall back to zero rather than forcing a second query on mobile.
   */
  toDto(form: EvaluationFormWithCounts): EvaluationFormDto {
    return {
      evaluation_form_id: form.evaluation_form_id,
      title: form.title,
      description: form.description,
      header_typography: this.parseTypography(form.header_typography),
      questions: this.parseQuestions(form.questions),
      status: form.status,
      is_default: form.is_default,
      assigned_events: form._count?.assignments ?? 0,
      response_count: form._count?.responses ?? 0,
      created_at: form.createdAt.toISOString(),
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
