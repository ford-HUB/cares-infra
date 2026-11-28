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

/** Counts only when the query asked for them. */
export type EvaluationFormWithCounts = EvaluationForm & {
  _count?: { assignments: number; responses: number };
};

/** Shared by portal and app so both see the same shape. */
@Injectable()
export class EvaluationFormService {
  /** Mobile reads a bare row, so counts default to zero. */
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

  /** Validated on write; drops hand-edited bad entries instead of 500ing. */
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

  /** Same test as the portal. */
  isAnswered(value: EvaluationAnswersDto[string] | undefined): boolean {
    if (value === undefined || value === null) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  }
}
