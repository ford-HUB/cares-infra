import { Injectable } from '@nestjs/common';
import {
  EvaluationFormStatus,
  EvaluationResponseStatus,
  type Prisma,
} from '../../../infastructures/prisma/common/client';
import { PrismaService } from '../../../infastructures/prisma/prisma-service';

/** The response row plus enough of the event and volunteer to fill the portal table. */
const RESPONSE_INCLUDE = {
  event: { select: { event_id: true, title: true } },
  form: { select: { evaluation_form_id: true, title: true } },
  user: {
    select: {
      user_id: true,
      firstname: true,
      lastname: true,
      accounts: {
        select: { email: true },
        orderBy: { createdAt: 'asc' },
        take: 1,
      },
      user_school_info: {
        select: { department: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  },
} as const;

export type EvaluationResponseRow = Prisma.EvaluationResponseGetPayload<{
  include: typeof RESPONSE_INCLUDE;
}>;

/** The assignment plus the event and questionnaire the portal's Forms page shows. */
const ASSIGNMENT_INCLUDE = {
  event: {
    select: {
      event_id: true,
      title: true,
      location: true,
      status: true,
      participants: true,
      event_started: true,
      event_ended: true,
    },
  },
  form: { select: { evaluation_form_id: true, title: true, status: true } },
  assigned_by: { select: { firstname: true, lastname: true } },
} as const;

export type EvaluationAssignmentRow = Prisma.EvaluationAssignmentGetPayload<{
  include: typeof ASSIGNMENT_INCLUDE;
}>;

/** A questionnaire with the tallies the Forms page reads off the row itself. */
export type EvaluationFormRow = Prisma.EvaluationFormGetPayload<{
  include: { _count: { select: { assignments: true; responses: true } } };
}>;

export interface EvaluationFormWrite {
  title: string;
  description: string;
  header_typography: Prisma.InputJsonValue;
  questions: Prisma.InputJsonValue;
  status: EvaluationFormStatus;
}

export interface EvaluationAssignmentWrite {
  form_id: string;
  event_id: number;
  assigned_by_id: string | null;
}

export interface EvaluationResponseWrite {
  form_id: string;
  event_id: number;
  user_id: string;
  answers: Prisma.InputJsonValue;
  rating: number | null;
  status: EvaluationResponseStatus;
}

/** The tallies every questionnaire row is served with. */
const FORM_COUNTS = {
  _count: { select: { assignments: true, responses: true } },
} as const;

/** What the builder opens with the first time, before a director has saved anything. */
const DEFAULT_FORM: EvaluationFormWrite = {
  title: 'Post-Event Volunteer Evaluation',
  description:
    'Tell us how the event went for you. Your answers help the CARES office plan the next one.',
  header_typography: { font_family: 'inter', font_size: 'xl' },
  questions: [],
  status: EvaluationFormStatus.DRAFT,
};

@Injectable()
export class EvaluationRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Every questionnaire the director has built, newest first. The first read of an
   * empty table seeds the starter form rather than leaving the builder with nothing
   * to open — the same row the pre-assignment portal edited.
   */
  async findForms(): Promise<EvaluationFormRow[]> {
    const rows = await this.prisma.evaluationForm.findMany({
      include: FORM_COUNTS,
      orderBy: { updatedAt: 'desc' },
    });
    if (rows.length > 0) return rows;
    const seeded = await this.prisma.evaluationForm.create({
      data: { ...DEFAULT_FORM, is_default: true },
      include: FORM_COUNTS,
    });
    return [seeded];
  }

  async findForm(formId: string): Promise<EvaluationFormRow | null> {
    return this.prisma.evaluationForm.findUnique({
      where: { evaluation_form_id: formId },
      include: FORM_COUNTS,
    });
  }

  async createForm(data: EvaluationFormWrite): Promise<EvaluationFormRow> {
    return this.prisma.evaluationForm.create({
      data,
      include: FORM_COUNTS,
    });
  }

  async updateForm(
    formId: string,
    data: EvaluationFormWrite,
  ): Promise<EvaluationFormRow> {
    return this.prisma.evaluationForm.update({
      where: { evaluation_form_id: formId },
      data,
      include: FORM_COUNTS,
    });
  }

  async deleteForm(formId: string) {
    return this.prisma.evaluationForm.delete({
      where: { evaluation_form_id: formId },
    });
  }

  /**
   * Moves the fallback flag rather than adding a second holder, so an event with no
   * assignment can only ever resolve to one questionnaire.
   */
  async setDefaultForm(formId: string): Promise<EvaluationFormRow> {
    const [, form] = await this.prisma.$transaction([
      this.prisma.evaluationForm.updateMany({
        where: { is_default: true, evaluation_form_id: { not: formId } },
        data: { is_default: false },
      }),
      this.prisma.evaluationForm.update({
        where: { evaluation_form_id: formId },
        data: { is_default: true },
        include: FORM_COUNTS,
      }),
    ]);
    return form;
  }

  /** The published fallback for an event nobody has assigned a questionnaire to. */
  async findDefaultPublishedForm() {
    return this.prisma.evaluationForm.findFirst({
      where: { is_default: true, status: EvaluationFormStatus.PUBLISHED },
    });
  }

  /**
   * The questionnaire this event asks: its own assignment when it has one and that
   * questionnaire is published, the default otherwise. An assigned-but-draft form
   * falls through on purpose — a draft is never shown to a volunteer.
   */
  async findFormForEvent(eventId: number) {
    const assignment = await this.prisma.evaluationAssignment.findUnique({
      where: { event_id: eventId },
      include: { form: true },
    });
    if (
      assignment &&
      assignment.form.status === EvaluationFormStatus.PUBLISHED
    ) {
      return assignment.form;
    }
    return this.findDefaultPublishedForm();
  }

  /** Every event-to-questionnaire assignment, newest first. */
  async findAssignments(): Promise<EvaluationAssignmentRow[]> {
    return this.prisma.evaluationAssignment.findMany({
      include: ASSIGNMENT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * One questionnaire per event: assigning to an event that already has one replaces
   * it, which is what the Forms page's picker offers.
   */
  async upsertAssignment(data: EvaluationAssignmentWrite) {
    return this.prisma.evaluationAssignment.upsert({
      where: { event_id: data.event_id },
      create: data,
      update: { form_id: data.form_id, assigned_by_id: data.assigned_by_id },
      include: ASSIGNMENT_INCLUDE,
    });
  }

  async findAssignment(assignmentId: string) {
    return this.prisma.evaluationAssignment.findUnique({
      where: { evaluation_assignment_id: assignmentId },
      include: ASSIGNMENT_INCLUDE,
    });
  }

  async deleteAssignment(assignmentId: string) {
    return this.prisma.evaluationAssignment.delete({
      where: { evaluation_assignment_id: assignmentId },
    });
  }

  async eventExists(eventId: number): Promise<boolean> {
    const event = await this.prisma.event.findUnique({
      where: { event_id: eventId },
      select: { event_id: true },
    });
    return event !== null;
  }

  /** Events the picker offers, with the assignment each one already carries. */
  async findAssignableEvents() {
    return this.prisma.event.findMany({
      select: {
        event_id: true,
        title: true,
        location: true,
        status: true,
        participants: true,
        event_started: true,
        event_ended: true,
        evaluation_assignment: {
          select: { evaluation_assignment_id: true, form_id: true },
        },
      },
      orderBy: { event_started: 'desc' },
    });
  }

  async findEventForSubmission(eventId: number, userId: string) {
    return this.prisma.event.findUnique({
      where: { event_id: eventId },
      select: {
        event_id: true,
        title: true,
        status: true,
        event_ended: true,
        attendances: {
          where: { user_id: userId },
          select: { status: true },
        },
      },
    });
  }

  async findResponseForUser(eventId: number, userId: string) {
    return this.prisma.evaluationResponse.findUnique({
      where: { event_id_user_id: { event_id: eventId, user_id: userId } },
    });
  }

  async createResponse(data: EvaluationResponseWrite) {
    return this.prisma.evaluationResponse.create({ data });
  }

  /** Every event the volunteer has answered for, newest submission first. */
  async findSubmissionsForUser(userId: string) {
    return this.prisma.evaluationResponse.findMany({
      where: { user_id: userId },
      select: { event_id: true, submitted_at: true },
      orderBy: { submitted_at: 'desc' },
    });
  }

  /** Just the answers of one response — what the image proxy checks a key against. */
  async findResponseAnswers(responseId: string) {
    return this.prisma.evaluationResponse.findUnique({
      where: { evaluation_response_id: responseId },
      select: { answers: true },
    });
  }

  /** All responses, or one event's, newest first for the portal table. */
  async findResponses(eventId?: number): Promise<EvaluationResponseRow[]> {
    return this.prisma.evaluationResponse.findMany({
      where: eventId ? { event_id: eventId } : undefined,
      include: RESPONSE_INCLUDE,
      orderBy: { submitted_at: 'desc' },
    });
  }
}
