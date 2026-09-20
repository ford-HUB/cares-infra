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

export interface EvaluationFormWrite {
  title: string;
  description: string;
  header_typography: Prisma.InputJsonValue;
  questions: Prisma.InputJsonValue;
  status: EvaluationFormStatus;
}

export interface EvaluationResponseWrite {
  form_id: string;
  event_id: number;
  user_id: string;
  answers: Prisma.InputJsonValue;
  rating: number | null;
  status: EvaluationResponseStatus;
}

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
   * The portal edits a single questionnaire, so there is one row and it is created
   * on first read rather than by a seeder.
   */
  async findOrCreateForm() {
    const existing = await this.prisma.evaluationForm.findFirst({
      orderBy: { createdAt: 'asc' },
    });
    if (existing) return existing;
    return this.prisma.evaluationForm.create({ data: DEFAULT_FORM });
  }

  async findPublishedForm() {
    return this.prisma.evaluationForm.findFirst({
      where: { status: EvaluationFormStatus.PUBLISHED },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateForm(formId: string, data: EvaluationFormWrite) {
    return this.prisma.evaluationForm.update({
      where: { evaluation_form_id: formId },
      data,
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

  /** All responses, or one event's, newest first for the portal table. */
  async findResponses(eventId?: number): Promise<EvaluationResponseRow[]> {
    return this.prisma.evaluationResponse.findMany({
      where: eventId ? { event_id: eventId } : undefined,
      include: RESPONSE_INCLUDE,
      orderBy: { submitted_at: 'desc' },
    });
  }
}
