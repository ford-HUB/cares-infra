import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AttendanceStatus,
  EvaluationResponseStatus,
  EventStatus,
  type EvaluationResponse,
} from '../../../infastructures/prisma/common/client';
import type {
  EvaluationSubmissionDto,
  EvaluationSubmissionsResponseDto,
  EventEvaluationDto,
  SubmitEvaluationDto,
  SubmitEvaluationResponseDto,
} from '../dto/evaluation-mobile-dto';
import type {
  EvaluationAnswersDto,
  EvaluationQuestionDto,
} from '../dto/evaluation-site-dto';
import { EvaluationRepository } from '../repositories/evaluation-repository';
import { EvaluationAnswersSchema } from '../validators/evaluation-site-validator';
import { EvaluationFormService } from './evaluation-form-service';

type SubmissionEvent = NonNullable<
  Awaited<ReturnType<EvaluationRepository['findEventForSubmission']>>
>;

@Injectable()
export class EvaluationMobileService {
  constructor(
    private readonly evaluationRepository: EvaluationRepository,
    private readonly evaluationFormService: EvaluationFormService,
  ) {}

  /**
   * The feedback screen's one load: the published questionnaire for this event
   * plus whether the caller can still answer it. `can_submit` folds the same
   * checks `submit` enforces, so the app can show the right state up front.
   */
  async getForEvent(
    userId: string,
    eventId: number,
  ): Promise<EventEvaluationDto> {
    const event = await this.evaluationRepository.findEventForSubmission(
      eventId,
      userId,
    );
    if (!event) throw new NotFoundException('Event not found');

    const [form, existing] = await Promise.all([
      this.evaluationRepository.findPublishedForm(),
      this.evaluationRepository.findResponseForUser(eventId, userId),
    ]);

    return {
      event_id: event.event_id,
      event_title: event.title,
      event_status: event.status,
      form: form ? this.evaluationFormService.toDto(form) : null,
      can_submit:
        !!form && !existing && this.hasEnded(event) && this.participated(event),
      submission: existing ? this.toSubmissionDto(existing) : null,
    };
  }

  /**
   * Records the volunteer's answers once per event. Only a volunteer who joined
   * an event that has finished may answer, and only against the published form.
   */
  async submit(
    userId: string,
    eventId: number,
    data: SubmitEvaluationDto,
  ): Promise<SubmitEvaluationResponseDto> {
    const event = await this.evaluationRepository.findEventForSubmission(
      eventId,
      userId,
    );
    if (!event) throw new NotFoundException('Event not found');
    if (!this.hasEnded(event)) {
      throw new BadRequestException(
        'Feedback opens once the event has been completed',
      );
    }
    if (this.attendancePending(event)) {
      throw new BadRequestException(
        'Feedback opens once your attendance has been validated',
      );
    }
    if (!this.participated(event)) {
      throw new ForbiddenException(
        'Only volunteers who took part in this event can give feedback',
      );
    }

    const form = await this.evaluationRepository.findPublishedForm();
    if (!form) {
      throw new BadRequestException(
        'No questionnaire has been published for this event yet',
      );
    }

    const existing = await this.evaluationRepository.findResponseForUser(
      eventId,
      userId,
    );
    if (existing) {
      throw new ConflictException(
        'You have already submitted feedback for this event',
      );
    }

    const questions = this.evaluationFormService.parseQuestions(form.questions);
    const answers = this.pickKnownAnswers(questions, data.answers);

    const response = await this.evaluationRepository.createResponse({
      form_id: form.evaluation_form_id,
      event_id: eventId,
      user_id: userId,
      answers,
      rating: this.ratingOf(questions, answers),
      status: this.statusOf(questions, answers),
    });

    return { event_id: eventId, submission: this.toSubmissionDto(response) };
  }

  async listSubmissions(
    userId: string,
  ): Promise<EvaluationSubmissionsResponseDto> {
    const rows = await this.evaluationRepository.findSubmissionsForUser(userId);
    return {
      submissions: rows.map((row) => ({
        event_id: row.event_id,
        submitted_at: row.submitted_at.toISOString(),
      })),
    };
  }

  /**
   * Marked Completed by the status sweep, or past its end time — the sweep runs
   * on a timer, so the app may reach here a minute before the flag flips.
   */
  private hasEnded(event: SubmissionEvent): boolean {
    return (
      event.status === EventStatus.Completed ||
      (event.status !== EventStatus.Cancelled &&
        event.event_ended.getTime() <= Date.now())
    );
  }

  /**
   * The geofence validator has not ruled on the registration yet. Feedback
   * waits for that ruling rather than opening the moment the event ends, so
   * a volunteer later marked absent never gets a submission in first.
   */
  private attendancePending(event: SubmissionEvent): boolean {
    return (
      event.attendances.length > 0 &&
      event.attendances.every(
        (row) => row.status === AttendanceStatus.PENDING,
      )
    );
  }

  /** Holds a registration the validator confirmed. */
  private participated(event: SubmissionEvent): boolean {
    return event.attendances.some(
      (row) => row.status === AttendanceStatus.COMPLETED,
    );
  }

  /** Drops answers to questions the form no longer has, so stale ids don't get stored. */
  private pickKnownAnswers(
    questions: EvaluationQuestionDto[],
    answers: EvaluationAnswersDto,
  ): EvaluationAnswersDto {
    const known = new Set(questions.map((question) => question.id));
    return Object.fromEntries(
      Object.entries(answers).filter(([id]) => known.has(id)),
    );
  }

  /** The first star-rating answer, surfaced on the response row for the portal. */
  private ratingOf(
    questions: EvaluationQuestionDto[],
    answers: EvaluationAnswersDto,
  ): number | null {
    const question = questions.find((q) => q.type === 'star_rating');
    if (!question) return null;
    const value = answers[question.id];
    return typeof value === 'number' && Number.isFinite(value)
      ? Math.round(value)
      : null;
  }

  private statusOf(
    questions: EvaluationQuestionDto[],
    answers: EvaluationAnswersDto,
  ): EvaluationResponseStatus {
    const complete = questions
      .filter((question) => question.required)
      .every((question) =>
        this.evaluationFormService.isAnswered(answers[question.id]),
      );
    return complete
      ? EvaluationResponseStatus.COMPLETE
      : EvaluationResponseStatus.PARTIAL;
  }

  private toSubmissionDto(row: EvaluationResponse): EvaluationSubmissionDto {
    const parsed = EvaluationAnswersSchema.safeParse(row.answers);
    return {
      evaluation_response_id: row.evaluation_response_id,
      submitted_at: row.submitted_at.toISOString(),
      answers: parsed.success ? parsed.data : {},
    };
  }
}
