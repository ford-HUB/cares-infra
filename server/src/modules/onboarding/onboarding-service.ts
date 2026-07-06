import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { InterestCode, RoleType } from "../../infastructures/prisma/common/client";
import { UserInterestsResponseDto } from "./onboarding-dto";
import { OnboardingRepository } from "./onboarding-repository";

@Injectable()
export class OnboardingService {
    constructor(private readonly onboardingRepository: OnboardingRepository) {}

    async listInterests() {
        return this.onboardingRepository.listActiveInterests();
    }

    async saveUserInterests(userId: string, selected: InterestCode[]) {
        const user = await this.onboardingRepository.findUserWithRole(userId);
        if (!user) {
            throw new NotFoundException("User not found");
        }

        if (user.role.type !== RoleType.VOLUNTEER) {
            throw new ForbiddenException("Only volunteers can save interests");
        }

        const activeCodes = await this.onboardingRepository.findActiveInterestCodes(selected);
        if (activeCodes.length !== selected.length) {
            throw new BadRequestException("One or more interest codes are invalid or inactive");
        }

        return this.onboardingRepository.upsertUserInterests(userId, selected);
    }

    async getUserInterests(userId: string): Promise<UserInterestsResponseDto> {
        const row = await this.onboardingRepository.findUserInterests(userId);
        if (!row) {
            return { selected: null };
        }

        return { selected: row.selected as InterestCode[] };
    }
}
