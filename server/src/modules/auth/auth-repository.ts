import { NotFoundException, Injectable } from "@nestjs/common";
import { Prisma } from "../../infastructures/prisma/common/client";
import { PrismaService } from "../../infastructures/prisma/prisma-service";
import { CreateUserDto } from "./auth-dto";

@Injectable()
export class AuthRepository {
    constructor(
        private readonly prisma: PrismaService,
    ) {}

    async createUser (data: CreateUserDto) {
        return await this.prisma.$transaction(async (tx) => {
            const department = await this.findOrCreateDepartment(
                tx,
                data.school_info.department.name,
            );

            const major = await this.findOrCreateMajor(
                tx,
                data.school_info.major.name,
            );

            const yearLevel = await this.findOrCreateYearLevel(
                tx,
                data.school_info.year_level.name,
            );

            const role = (await tx.role.findFirst({
                    where: { type: data.role_type },
                    select: { role_id: true },
                })) ??
                (await tx.role.create({
                    data: { type: data.role_type },
                    select: { role_id: true },
                }));


            const user = await tx.user.create({
                data: {
                    firstname: data.firstname,
                    lastname: data.lastname,
                    middle_name: data.middle_name,
                    gender: data.gender,
                    age: data.age,
                    current_address: data.current_address,
                    phone_number: data.phone_number,
                    role: {
                        connect: {
                            role_id: role.role_id,
                        },
                    },
                    user_school_info: {
                        create: {
                            id_number: data.school_info.id_number,
                            graduation_year: data.school_info.graduation_year,
                            graduation_month: data.school_info.graduation_month,
                            graduation_day: data.school_info.graduation_day,
                            department: {
                                connect: {
                                    department_id: department.department_id,
                                },
                            },
                            major: {
                                connect: {
                                    major_id: major.major_id,
                                },
                            },
                            year_level: {
                                connect: {
                                    year_level_id: yearLevel.year_level_id,
                                },
                            },
                        },
                    },
                    user_biometrics: {
                        create: {
                            face_url: data.biometric.face_url,
                            embedding: data.biometric.embedding,
                            embedding_type: data.biometric.embedding_type,
                            isActive: data.biometric.isActive,
                        },
                    },
                },
                select: {
                    user_id: true,
                    user_biometrics: {
                        select: {
                            user_biometric_id: true,
                        },
                    },
                },
            });

            const account = await tx.account.create({
                data: {
                    email: data.account.email,
                    password: data.account.password,
                    user: {
                        connect: {
                            user_id: user.user_id,
                        },
                    },
                },
                select: {
                    account_id: true,
                },
            });

            return {
                user_id: user.user_id,
                account_id: account.account_id,
                user_biometric_id: user.user_biometrics[0].user_biometric_id,
            };
        });
    }

    async findUserByEmail (email: string) {
        return await this.prisma.account.findUnique({
            where: {
                email,
            },
            include: {
                user: true,
            },
        });
    }

    private async findOrCreateDepartment(
        tx: Prisma.TransactionClient,
        name: string,
    ) {
        const normalizedName = name.trim();
        if (!normalizedName) {
            throw new NotFoundException('Department name is required');
        }

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
        if (!normalizedName) {
            throw new NotFoundException('Major name is required');
        }

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

    private async findOrCreateYearLevel(
        tx: Prisma.TransactionClient,
        name: string,
    ) {
        const normalizedName = name.trim();
        if (!normalizedName) {
            throw new NotFoundException('Year level name is required');
        }

        const existing = await tx.yearLevel.findFirst({
            where: { name: normalizedName },
            select: { year_level_id: true },
        });

        if (existing) {
            return existing;
        }

        return tx.yearLevel.create({
            data: { name: normalizedName },
            select: { year_level_id: true },
        });
    }
}
