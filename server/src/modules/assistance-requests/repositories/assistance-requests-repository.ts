import { Injectable } from '@nestjs/common';
import {
  Prisma,
  type AssistanceCategory,
  type AssistanceUrgency,
} from '../../../infastructures/prisma/common/client';
import { PrismaService } from '../../../infastructures/prisma/prisma-service';

export interface CreateAssistanceRequestInput {
  userId: string;
  title: string;
  category: AssistanceCategory;
  description: string;
  urgency: AssistanceUrgency;
  householdSize: number;
  attachments: { name: string; url: string; mime: string; sizeBytes: number }[];
}

const requestInclude = {
  attachments: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.AssistanceRequestInclude;

export type AssistanceRequestRow = Prisma.AssistanceRequestGetPayload<{
  include: typeof requestInclude;
}>;

@Injectable()
export class AssistanceRequestsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string): Promise<AssistanceRequestRow[]> {
    return this.prisma.assistanceRequest.findMany({
      where: { user_id: userId },
      include: requestInclude,
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  /** The household size saved on the beneficiary's profile, if any. */
  async findHouseholdSize(userId: string): Promise<number | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { household_size: true },
    });
    return user?.household_size ?? null;
  }

  async create(
    input: CreateAssistanceRequestInput,
  ): Promise<AssistanceRequestRow> {
    return this.prisma.assistanceRequest.create({
      data: {
        user_id: input.userId,
        title: input.title,
        category: input.category,
        description: input.description,
        urgency: input.urgency,
        household_size: input.householdSize,
        attachments: {
          create: input.attachments.map((file) => ({
            name: file.name,
            url: file.url,
            mime: file.mime,
            size_bytes: file.sizeBytes,
          })),
        },
      },
      include: requestInclude,
    });
  }
}
