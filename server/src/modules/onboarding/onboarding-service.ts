import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { InterestCode, Prisma, RoleType } from "../../infastructures/prisma/common/client";
import {
    SaveVolunteerProfileDto,
    VolunteerProfileResponseDto,
} from "./onboarding-dto";
import { OnboardingRepository } from "./onboarding-repository";
import {
    isVolunteerProfileComplete,
    parseVolunteerProfilePayload,
    serializeVolunteerProfile,
    toVolunteerProfileResponse,
} from "./volunteer-profile-utils";

@Injectable()
export class OnboardingService {
    constructor(private readonly onboardingRepository: OnboardingRepository) {}

    async listInterests() {
        return this.onboardingRepository.listActiveInterests();
    }

    async saveUserInterests(userId: string, selected: InterestCode[]) {
        return this.saveVolunteerProfile(userId, {
            interests: selected,
            skills: [],
            availability: [],
        });
    }

    async saveVolunteerProfile(userId: string, data: SaveVolunteerProfileDto) {
        const user = await this.onboardingRepository.findUserWithRole(userId);
        if (!user) {
            throw new NotFoundException("User not found");
        }

        if (user.role.type !== RoleType.VOLUNTEER) {
            throw new ForbiddenException("Only volunteers can save a volunteer profile");
        }

        const activeCodes = await this.onboardingRepository.findActiveInterestCodes(data.interests);
        if (activeCodes.length !== data.interests.length) {
            throw new BadRequestException("One or more interest codes are invalid or inactive");
        }

        const stored = serializeVolunteerProfile(data) as Prisma.InputJsonValue;
        await this.onboardingRepository.upsertUserInterests(userId, stored);

        return toVolunteerProfileResponse(stored);
    }

    async getUserInterests(userId: string): Promise<VolunteerProfileResponseDto> {
        const row = await this.onboardingRepository.findUserInterests(userId);
        if (!row) {
            return toVolunteerProfileResponse(null);
        }

        return toVolunteerProfileResponse(row.selected);
    }

    async getVolunteerProfile(userId: string): Promise<VolunteerProfileResponseDto> {
        return this.getUserInterests(userId);
    }

    async hasCompleteVolunteerProfile(userId: string): Promise<boolean> {
        const row = await this.onboardingRepository.findUserInterests(userId);
        if (!row) {
            return false;
        }

        return isVolunteerProfileComplete(parseVolunteerProfilePayload(row.selected));
    }
}
