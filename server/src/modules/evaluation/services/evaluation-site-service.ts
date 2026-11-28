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

  async listForms(): Promise<EvaluationFormDto[]> {
    const forms = await this.evaluationRepository.findForms();
    return forms.map((form) => this.evaluationFormService.toDto(form));
  }

  async getForm(formId: string): Promise<EvaluationFormDto> {
    const form = await this.evaluationRepository.findForm(formId);
    if (!form) throw new NotFoundException('Questionnaire not found');
    return this.evaluationFormService.toDto(form);
  }

  /** Starts empty as a draft; reaches volunteers only once published and assigned. */
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

  /** Whole replace; builder question ids are kept so answers stay keyed to them. */
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

  /** Answered forms are kept (responses would cascade); unassign to retire. */
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

  /** Drafts can be assigned; the app serves the default until published. */
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

  /** The event falls back to the default. */
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

  /** Unpaged: the portal filters client-side. */
  async listResponses(eventId?: number): Promise<EvaluationResponseRowDto[]> {
    const rows = await this.evaluationRepository.findResponses(eventId);
    return rows.map((row) => this.mapToDto(row));
  }

  /** Key read from the stored answer and must sit under the evaluation prefix. */
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
