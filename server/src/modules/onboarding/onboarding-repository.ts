import { Injectable, NotFoundException } from "@nestjs/common";
import { InterestCode, Prisma } from "../../infastructures/prisma/common/client";
import { PrismaService } from "../../infastructures/prisma/prisma-service";
import { UpdateVolunteerAccountProfileDto } from "./onboarding-dto";

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

    async upsertUserInterests(userId: string, selected: Prisma.InputJsonValue) {
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

    async findVolunteerAccountProfile(userId: string) {
        return this.prisma.user.findUnique({
            where: { user_id: userId },
            select: {
                firstname: true,
                lastname: true,
                phone_number: true,
                accounts: {
                    select: { email: true },
                    take: 1,
                },
                user_school_info: {
                    take: 1,
                    orderBy: { createdAt: "desc" },
                    select: {
                        id_number: true,
                        department: { select: { name: true } },
                        major: { select: { name: true } },
                    },
                },
            },
        });
    }

    async updateVolunteerAccountProfile(
        userId: string,
        data: UpdateVolunteerAccountProfileDto,
    ) {
        return this.prisma.$transaction(async (tx) => {
            const existing = await tx.user.findUnique({
                where: { user_id: userId },
                select: {
                    user_id: true,
                    user_school_info: {
                        take: 1,
                        orderBy: { createdAt: "desc" },
                        select: { user_school_info_id: true },
                    },
                },
            });

            if (!existing) {
                throw new NotFoundException("User not found");
            }

            await tx.user.update({
                where: { user_id: userId },
                data: {
                    firstname: data.firstname,
                    lastname: data.lastname,
                    phone_number: data.phone_number,
                },
            });

            const schoolInfo = existing.user_school_info[0];
            if (schoolInfo && (data.department || data.course)) {
                const updateData: Prisma.UserSchoolInfoUpdateInput = {};

                if (data.department) {
                    const department = await this.findOrCreateDepartment(tx, data.department);
                    updateData.department = {
                        connect: { department_id: department.department_id },
                    };
                }

                if (data.course) {
                    const major = await this.findOrCreateMajor(tx, data.course);
                    updateData.major = {
                        connect: { major_id: major.major_id },
                    };
                }

                await tx.userSchoolInfo.update({
                    where: { user_school_info_id: schoolInfo.user_school_info_id },
                    data: updateData,
                });
            }
        });
    }

    private async findOrCreateDepartment(
        tx: Prisma.TransactionClient,
        name: string,
    ) {
        const normalizedName = name.trim();
        const existing = await tx.department.findFirst({
            where: { name: normalizedName },
            select: { department_id: true },
        });

        if (existing) {
            return existing;
        }

        return tx.department.create({
            data: { name: normalizedName },
            select: { department_id: true },
        });
    }

    private async findOrCreateMajor(
        tx: Prisma.TransactionClient,
        name: string,
    ) {
        const normalizedName = name.trim();
        const existing = await tx.major.findFirst({
            where: { name: normalizedName },
            select: { major_id: true },
        });

        if (existing) {
            return existing;
        }

        return tx.major.create({
            data: { name: normalizedName },
            select: { major_id: true },
        });
    }
}
