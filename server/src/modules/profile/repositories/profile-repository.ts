import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infastructures/prisma/prisma-service';
import { UpdatePortalProfileDto } from '../dto/profile-site-dto';

@Injectable()
export class ProfileRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findPortalProfile(userId: string) {
        return this.prisma.user.findUnique({
            where: { user_id: userId },
            select: {
                user_id: true,
                firstname: true,
                lastname: true,
                gender: true,
                phone_number: true,
                avatar: true,
                portal_department: true,
                address_street: true,
                address_barangay: true,
                address_city: true,
                address_province: true,
                signature_url: true,
                accounts: {
                    select: { email: true },
                    take: 1,
                },
                role: {
                    select: { type: true },
                },
            },
        });
    }

    async updatePortalProfile(
        userId: string,
        data: UpdatePortalProfileDto & {
            avatar?: string | null;
            signature_url?: string | null;
        },
    ) {
        return this.prisma.user.update({
            where: { user_id: userId },
            data: {
                firstname: data.firstname,
                lastname: data.lastname,
                phone_number: data.phone_number,
                gender: data.gender,
                portal_department: data.department,
                address_street: data.address_street,
                address_barangay: data.address_barangay,
                address_city: data.address_city,
                address_province: data.address_province,
                ...(data.avatar !== undefined ? { avatar: data.avatar } : {}),
                ...(data.signature_url !== undefined ? { signature_url: data.signature_url } : {}),
            },
            select: { user_id: true },
        });
    }

    async findPhoneOwner(phoneNumber: string, excludeUserId: string) {
        return this.prisma.user.findFirst({
            where: {
                phone_number: phoneNumber,
                NOT: { user_id: excludeUserId },
            },
            select: { user_id: true },
        });
    }
}
