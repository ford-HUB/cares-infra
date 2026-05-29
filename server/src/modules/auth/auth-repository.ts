import { NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma-service";
import { CreateBiometricDto, CreateUserDto } from "./auth-dto";
import { Injectable } from "@nestjs/common";

@Injectable()
export class AuthRepository {
    constructor(private readonly prisma: PrismaService) {}

    async createUser (data: CreateUserDto) {
        return await this.prisma.$transaction(async (tx) => {
            const department = await tx.department.findFirst({
                where: { name: data.department.name },
                select: { department_id: true },
            });

            if (!department) {
                throw new NotFoundException(
                    `Department not found: ${data.department.name}`,
                );
            }

            const major = await tx.major.findFirst({
                where: { name: data.major.name },
                select: { major_id: true },
            });

            if (!major) {
                throw new NotFoundException(`Major not found: ${data.major.name}`);
            }

            const yearLevel = await tx.yearLevel.findFirst({
                where: { name: data.year_level.name },
                select: { year_level_id: true },
            });

            if (!yearLevel) {
                throw new NotFoundException(
                    `Year level not found: ${data.year_level.name}`,
                );
            }

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
                    avatar: data.avatar,
                    role: {
                        connect: {
                            role_id: role.role_id,
                        },
                    },
                    user_school_info: {
                        create: {
                            id_number: data.id_number,
                            graduation_year: data.graduation_year,
                            graduation_month: data.graduation_month,
                            graduation_day: data.graduation_day,
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
                },
            });

            const account = await tx.account.create({
                data: {
                    email: data.email,
                    password: data.password,
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
            };
        });
    }

    async createBiometric (data: CreateBiometricDto) {
        return await this.prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({
                where: {
                    user_id: data.user_id,
                },
            });

            if (!user) {
                throw new NotFoundException('User not found');
            }

            const biometric = await tx.userBiometric.create({
                data: {
                    face_url: data.face_url,
                    embedding: data.embedding,
                    embedding_type: data.embedding_type,
                    isActive: data.isActive,
                    user: {
                        connect: {
                            user_id: user.user_id,
                        },
                    },
                },
                select: {
                    user_biometric_id: true,
                },
            });

            return {
                user_biometric_id: biometric.user_biometric_id,
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

}