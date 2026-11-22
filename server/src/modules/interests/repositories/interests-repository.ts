import { Injectable } from '@nestjs/common';
import { InterestCode } from '../../../infastructures/prisma/common/client';
import { PrismaService } from '../../../infastructures/prisma/prisma-service';

@Injectable()
export class InterestsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listActiveInterests() {
    return this.prisma.interest.findMany({
      where: { is_active: true },
      orderBy: { sort_order: 'asc' },
      select: {
        code: true,
        label: true,
        description: true,
        sort_order: true,
      },
    });
  }

  async findActiveInterestCodes(codes: InterestCode[]) {
    return this.prisma.interest.findMany({
      where: {
        is_active: true,
        code: { in: codes },
      },
      select: { code: true },
    });
  }

  async findUserWithRole(userId: string) {
    return this.prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        role: {
          select: { type: true },
        },
      },
    });
  }

  async upsertUserInterests(
    userId: string,
    selected: InterestCode[],
    otherInterest: string | null,
  ) {
    return this.prisma.userInterest.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        selected,
        other_interest: otherInterest,
      },
      update: {
        selected,
        other_interest: otherInterest,
      },
      select: {
        user_interest_id: true,
        user_id: true,
        selected: true,
        other_interest: true,
      },
    });
  }

  async findUserInterests(userId: string) {
    return this.prisma.userInterest.findUnique({
      where: { user_id: userId },
      select: { selected: true, other_interest: true },
    });
  }

  async hasUserInterests(userId: string) {
    const row = await this.prisma.userInterest.findUnique({
      where: { user_id: userId },
      select: { user_interest_id: true },
    });
    return row !== null;
  }
}
