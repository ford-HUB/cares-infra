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
import { randomUUID } from 'node:crypto';
import { S3Service } from '../../../infastructures/s3/s3-service';
import { EvaluationRepository } from '../repositories/evaluation-repository';
import { EVALUATION_IMAGE_FIELD_PREFIX } from '../validators/evaluation-mobile-validator';
import {
  EVALUATION_IMAGE_ALLOWED_MIMES,
  EVALUATION_IMAGE_KEY_PREFIX,
  EVALUATION_IMAGE_MAX_BYTES,
  EvaluationAnswersSchema,
} from '../validators/evaluation-site-validator';
import { EvaluationFormService } from './evaluation-form-service';

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
};

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
};

/** One checked photo, waiting for the upload that follows the checks. */
interface PendingImage {
  questionId: string;
  file: Express.Multer.File;
  mime: string;
}

type SubmissionEvent = NonNullable<
  Awaited<ReturnType<EvaluationRepository['findEventForSubmission']>>
>;

@Injectable()
export class EvaluationMobileService {
  constructor(
    private readonly evaluationRepository: EvaluationRepository,
    private readonly evaluationFormService: EvaluationFormService,
    private readonly s3Service: S3Service,
  ) {}

  /**
   * The feedback screen's one load: the questionnaire this event asks plus whether
   * the caller can still answer it. The form is the one the director assigned to
   * the event, or the default questionnaire when the event has none of its own.
   * `can_submit` folds the same checks `submit` enforces, so the app can show the
   * right state up front.
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
      this.evaluationRepository.findFormForEvent(eventId),
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
    files: Express.Multer.File[] = [],
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

    const form = await this.evaluationRepository.findFormForEvent(eventId);
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
    const pending = this.checkImages(questions, files);
    const answers = this.pickKnownAnswers(questions, data.answers);

    // Image answers are only ever the keys stored here: a client-sent value for
    // one is dropped, so nobody can point an answer at someone else's file.
    for (const question of questions) {
      if (question.type === 'image_upload') delete answers[question.id];
    }
    const keys = await this.uploadImages(eventId, userId, pending);
    for (const { questionId, key } of keys) {
      const current = answers[questionId];
      answers[questionId] = [...(Array.isArray(current) ? current : []), key];
    }

    let response: EvaluationResponse;
    try {
      response = await this.evaluationRepository.createResponse({
        form_id: form.evaluation_form_id,
        event_id: eventId,
        user_id: userId,
        answers,
        rating: this.ratingOf(questions, answers),
        status: this.statusOf(questions, answers),
      });
    } catch (error) {
      // No row points at the photos now, so don't leave them in the bucket.
      await this.deleteImages(keys.map(({ key }) => key));
      throw error;
    }

    return { event_id: eventId, submission: this.toSubmissionDto(response) };
  }

  /**
   * Every photo is checked before any is uploaded, so a bad third file doesn't
   * leave the first two in S3. Each must belong to an image-upload question and
   * stay inside that question's own cap.
   */
  private checkImages(
    questions: EvaluationQuestionDto[],
    files: Express.Multer.File[],
  ): PendingImage[] {
    const byId = new Map(questions.map((question) => [question.id, question]));
    const counts = new Map<string, number>();

    return files.map((file) => {
      const questionId = file.fieldname.startsWith(
        EVALUATION_IMAGE_FIELD_PREFIX,
      )
        ? file.fieldname.slice(EVALUATION_IMAGE_FIELD_PREFIX.length)
        : '';
      const question = byId.get(questionId);
      if (!question || question.type !== 'image_upload') {
        throw new BadRequestException(
          `${file.originalname} is not for an image question on this form`,
        );
      }

      const count = (counts.get(questionId) ?? 0) + 1;
      counts.set(questionId, count);
      if (count > question.max_files) {
        const plural = question.max_files === 1 ? '' : 's';
        throw new BadRequestException(
          `"${question.title || 'Image question'}" takes up to ${question.max_files} image${plural}`,
        );
      }

      const mime = resolveMime(file);
      if (!file.buffer?.length) {
        throw new BadRequestException(`${file.originalname} is empty`);
      }
      if (file.size > EVALUATION_IMAGE_MAX_BYTES) {
        const limitMb = EVALUATION_IMAGE_MAX_BYTES / (1024 * 1024);
        throw new BadRequestException(
          `${file.originalname} is larger than ${limitMb} MB`,
        );
      }
      if (
        !(EVALUATION_IMAGE_ALLOWED_MIMES as readonly string[]).includes(mime)
      ) {
        throw new BadRequestException(
          `${file.originalname} must be a JPEG, PNG, WebP or HEIC image`,
        );
      }
      return { questionId, file, mime };
    });
  }

  /**
   * Stores keys, not URLs: the bucket is private and the portal proxies reads.
   * If any upload fails, the ones that made it are removed again.
   */
  private async uploadImages(
    eventId: number,
    userId: string,
    pending: PendingImage[],
  ): Promise<{ questionId: string; key: string }[]> {
    const results = await Promise.allSettled(
      pending.map(async ({ questionId, file, mime }) => {
        const key = `${EVALUATION_IMAGE_KEY_PREFIX}${eventId}/${userId}/${randomUUID()}.${EXTENSION_BY_MIME[mime]}`;
        await this.s3Service.uploadToS3(key, file.buffer, mime);
        return { questionId, key };
      }),
    );

    const uploaded = results.flatMap((result) =>
      result.status === 'fulfilled' ? [result.value] : [],
    );
    const failed = results.find((result) => result.status === 'rejected');
    if (failed) {
      await this.deleteImages(uploaded.map(({ key }) => key));
      throw failed.reason;
    }
    return uploaded;
  }

  private async deleteImages(keys: string[]): Promise<void> {
    await Promise.allSettled(
      keys.map((key) => this.s3Service.deleteFromS3(key)),
    );
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
      event.attendances.every((row) => row.status === AttendanceStatus.PENDING)
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

/** Trusts the declared type when it is specific, else the file extension. */
function resolveMime(file: Express.Multer.File): string {
  if (file.mimetype && file.mimetype !== 'application/octet-stream') {
    return file.mimetype === 'image/jpg' ? 'image/jpeg' : file.mimetype;
  }
  const ext = file.originalname.split('.').pop()?.toLowerCase() ?? '';
  return MIME_BY_EXTENSION[ext] ?? file.mimetype;
}
