import { Injectable } from "@nestjs/common";
import { InterestCode } from "../../infastructures/prisma/common/client";
import { PrismaService } from "../../infastructures/prisma/prisma-service";

@Injectable()
export class OnboardingRepository {
    constructor(private readonly prisma: PrismaService) {}

    async listActiveInterests() {
        return this.prisma.interest.findMany({
            where: { is_active: true },
            orderBy: { sort_order: "asc" },
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

    async upsertUserInterests(userId: string, selected: InterestCode[]) {
        return this.prisma.userInterest.upsert({
            where: { user_id: userId },
            create: {
                user_id: userId,
                selected,
            },
            update: {
                selected,
            },
            select: {
                user_interest_id: true,
                user_id: true,
                selected: true,
            },
        });
    }

    async findUserInterests(userId: string) {
        return this.prisma.userInterest.findUnique({
            where: { user_id: userId },
            select: { selected: true },
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
