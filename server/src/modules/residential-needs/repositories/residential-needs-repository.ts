import { Injectable } from '@nestjs/common';
import {
  Prisma,
  type NeedsAssessment,
} from '../../../infastructures/prisma/common/client';
import { PrismaService } from '../../../infastructures/prisma/prisma-service';

export interface SaveNeedsAssessmentInput {
  needs: string[];
  otherNeed: string | null;
  seriousness: number;
  barriers: string[];
  otherBarrier: string | null;
  communityProblem: string;
  otherCommunityProblem: string | null;
  concern: string | null;
}

const surveyInclude = {
  user: {
    select: {
      lastname: true,
      address_barangay: true,
      household_size: true,
      /** Fallback head count when the profile has none — the latest request's. */
      assistance_requests: {
        select: { household_size: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  },
} satisfies Prisma.NeedsAssessmentInclude;

export type NeedsAssessmentRow = Prisma.NeedsAssessmentGetPayload<{
  include: typeof surveyInclude;
}>;

@Injectable()
export class ResidentialNeedsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Every submitted survey with the respondent's household details, newest first. */
  async listSurveys(): Promise<NeedsAssessmentRow[]> {
    return this.prisma.needsAssessment.findMany({
      include: surveyInclude,
      orderBy: [{ submitted_at: 'desc' }],
    });
  }

  async findByUser(userId: string): Promise<NeedsAssessment | null> {
    return this.prisma.needsAssessment.findUnique({
      where: { user_id: userId },
    });
  }

  /** One survey per account: the first take creates it, every update overwrites it. */
  async save(
    userId: string,
    input: SaveNeedsAssessmentInput,
  ): Promise<NeedsAssessment> {
    const answers = {
      needs: input.needs,
      other_need: input.otherNeed,
      seriousness: input.seriousness,
      barriers: input.barriers,
      other_barrier: input.otherBarrier,
      community_problem: input.communityProblem,
      other_community_problem: input.otherCommunityProblem,
      concern: input.concern,
      submitted_at: new Date(),
    };
    return this.prisma.needsAssessment.upsert({
      where: { user_id: userId },
      create: { user_id: userId, ...answers },
      update: answers,
    });
  }
}
