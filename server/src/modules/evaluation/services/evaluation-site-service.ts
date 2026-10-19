import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EvaluationFormStatus } from '../../../infastructures/prisma/common/client';
import type {
  AssignableEventDto,
  AssignEvaluationFormDto,
  CreateEvaluationFormDto,
  EvaluationAnswersDto,
  EvaluationAssignmentDto,
  EvaluationFormDto,
  EvaluationResponseRowDto,
  SaveEvaluationFormDto,
} from '../dto/evaluation-site-dto';
import {
  type EvaluationAssignmentRow,
  EvaluationRepository,
  type EvaluationResponseRow,
} from '../repositories/evaluation-repository';
import { S3Service } from '../../../infastructures/s3/s3-service';
import {
  EVALUATION_IMAGE_KEY_PREFIX,
  EvaluationAnswersSchema,
} from '../validators/evaluation-site-validator';
import { EvaluationFormService } from './evaluation-form-service';

@Injectable()
export class EvaluationSiteService {
  constructor(
    private readonly evaluationRepository: EvaluationRepository,
    private readonly evaluationFormService: EvaluationFormService,
    private readonly s3Service: S3Service,
  ) {}

  /** Every questionnaire, for the builder's switcher and the Forms page's list. */
  async listForms(): Promise<EvaluationFormDto[]> {
    const forms = await this.evaluationRepository.findForms();
    return forms.map((form) => this.evaluationFormService.toDto(form));
  }

  async getForm(formId: string): Promise<EvaluationFormDto> {
    const form = await this.evaluationRepository.findForm(formId);
    if (!form) throw new NotFoundException('Questionnaire not found');
    return this.evaluationFormService.toDto(form);
  }

  /**
   * A new questionnaire opens empty and as a draft — it reaches volunteers only
   * once the builder publishes it and it is assigned to an event.
   */
  async createForm(data: CreateEvaluationFormDto): Promise<EvaluationFormDto> {
    const created = await this.evaluationRepository.createForm({
      title: data.title,
      description: data.description,
      header_typography: { font_family: 'inter', font_size: 'xl' },
      questions: [],
      status: EvaluationFormStatus.DRAFT,
    });
    return this.evaluationFormService.toDto(created);
  }

  /**
   * Replaces the whole questionnaire. Question ids come from the builder and are
   * kept as-is — earlier answers stay keyed to them, so a question edited in
   * place keeps its history while one deleted and re-added starts fresh.
   */
  async saveForm(
    formId: string,
    data: SaveEvaluationFormDto,
  ): Promise<EvaluationFormDto> {
    const current = await this.evaluationRepository.findForm(formId);
    if (!current) throw new NotFoundException('Questionnaire not found');
    const saved = await this.evaluationRepository.updateForm(formId, {
      title: data.title,
      description: data.description,
      header_typography: data.header_typography,
      questions: data.questions,
      status: data.status,
    });
    return this.evaluationFormService.toDto(saved);
  }

  /**
   * Deleting takes its responses with it (the rows cascade), so a questionnaire
   * that has already been answered is kept instead — unassign it to retire it.
   */
  async deleteForm(formId: string): Promise<void> {
    const form = await this.evaluationRepository.findForm(formId);
    if (!form) throw new NotFoundException('Questionnaire not found');
    if (form._count.responses > 0) {
      throw new ConflictException(
        'This questionnaire has been answered — unassign it instead of deleting it',
      );
    }
    if (form.is_default) {
      throw new ConflictException(
        'Make another questionnaire the default before deleting this one',
      );
    }
    await this.evaluationRepository.deleteForm(formId);
  }

  /** Makes one questionnaire the fallback for events with none of their own. */
  async setDefaultForm(formId: string): Promise<EvaluationFormDto> {
    const form = await this.evaluationRepository.findForm(formId);
    if (!form) throw new NotFoundException('Questionnaire not found');
    if (form.status !== EvaluationFormStatus.PUBLISHED) {
      throw new BadRequestException(
        'Publish the questionnaire before making it the default',
      );
    }
    const saved = await this.evaluationRepository.setDefaultForm(formId);
    return this.evaluationFormService.toDto(saved);
  }

  async listAssignments(): Promise<EvaluationAssignmentDto[]> {
    const rows = await this.evaluationRepository.findAssignments();
    return rows.map((row) => this.toAssignmentDto(row));
  }

  /** The picker's list: every event, flagged with the questionnaire it carries. */
  async listAssignableEvents(): Promise<AssignableEventDto[]> {
    const events = await this.evaluationRepository.findAssignableEvents();
    return events.map((event) => ({
      event_id: event.event_id,
      title: event.title,
      location: event.location,
      status: event.status,
      participants: event.participants,
      event_started: event.event_started.toISOString(),
      event_ended: event.event_ended.toISOString(),
      assigned_form_id: event.evaluation_assignment?.form_id ?? null,
    }));
  }

  /**
   * Points one event at one questionnaire, replacing whatever it had. A draft can
   * be assigned ahead of publishing — the volunteer app only serves it once the
   * questionnaire goes live, and falls back to the default until then.
   */
  async assignForm(
    data: AssignEvaluationFormDto,
    assignedById: string | null,
  ): Promise<EvaluationAssignmentDto> {
    const form = await this.evaluationRepository.findForm(data.form_id);
    if (!form) throw new NotFoundException('Questionnaire not found');

    if (!(await this.evaluationRepository.eventExists(data.event_id))) {
      throw new NotFoundException('Event not found');
    }

    const row = await this.evaluationRepository.upsertAssignment({
      form_id: data.form_id,
      event_id: data.event_id,
      assigned_by_id: assignedById,
    });
    return this.toAssignmentDto(row);
  }

  /** Removing the assignment puts the event back on the default questionnaire. */
  async unassignForm(assignmentId: string): Promise<void> {
    const existing =
      await this.evaluationRepository.findAssignment(assignmentId);
    if (!existing) throw new NotFoundException('Assignment not found');
    await this.evaluationRepository.deleteAssignment(assignmentId);
  }

  private toAssignmentDto(
    row: EvaluationAssignmentRow,
  ): EvaluationAssignmentDto {
    const assigner = row.assigned_by;
    return {
      evaluation_assignment_id: row.evaluation_assignment_id,
      form_id: row.form_id,
      form_title: row.form.title,
      form_status: row.form.status,
      event_id: row.event.event_id,
      event_title: row.event.title,
      event_location: row.event.location,
      event_status: row.event.status,
      event_started: row.event.event_started.toISOString(),
      event_ended: row.event.event_ended.toISOString(),
      participants: row.event.participants,
      assigned_by: assigner
        ? `${assigner.firstname} ${assigner.lastname}`.trim()
        : null,
      assigned_at: row.createdAt.toISOString(),
    };
  }

  /**
   * Every submitted response, or one event's. The portal loads them once and
   * searches, filters and pages client-side, the same as the attendees roster.
   */
  async listResponses(eventId?: number): Promise<EvaluationResponseRowDto[]> {
    const rows = await this.evaluationRepository.findResponses(eventId);
    return rows.map((row) => this.mapToDto(row));
  }

  /**
   * One photo a participant attached to an image-upload answer. The key is read
   * off the stored answer rather than taken from the caller, and must sit under
   * the evaluation prefix, so this can never be steered at another object.
   */
  async getAnswerImage(responseId: string, questionId: string, index: number) {
    const row = await this.evaluationRepository.findResponseAnswers(responseId);
    if (!row) throw new NotFoundException('Response not found');

    const value = this.parseAnswers(row.answers)[questionId];
    const key = Array.isArray(value) ? value[index] : undefined;
    if (!key || !key.startsWith(EVALUATION_IMAGE_KEY_PREFIX)) {
      throw new NotFoundException('Image not found');
    }
    return this.s3Service.getObject(key);
  }

  private mapToDto(row: EvaluationResponseRow): EvaluationResponseRowDto {
    return {
      evaluation_response_id: row.evaluation_response_id,
      form_id: row.form.evaluation_form_id,
      form_title: row.form.title,
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
