import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { InterestCode, RoleType } from "../../../infastructures/prisma/common/client";
import { UserInterestsResponseDto } from "../dto/interests-mobile-dto";
import { InterestsRepository } from "../repositories/interests-repository";

@Injectable()
export class InterestsMobileService {
    constructor(private readonly interestsRepository: InterestsRepository) {}

    async listInterests() {
        return this.interestsRepository.listActiveInterests();
    }

    async saveUserInterests(userId: string, selected: InterestCode[]) {
        const user = await this.interestsRepository.findUserWithRole(userId);
        if (!user) {
            throw new NotFoundException("User not found");
        }

        if (user.role.type !== RoleType.VOLUNTEER) {
            throw new ForbiddenException("Only volunteers can save interests");
        }

        const activeCodes = await this.interestsRepository.findActiveInterestCodes(selected);
        if (activeCodes.length !== selected.length) {
            throw new BadRequestException("One or more interest codes are invalid or inactive");
        }

        return this.interestsRepository.upsertUserInterests(userId, selected);
    }

    async getUserInterests(userId: string): Promise<UserInterestsResponseDto> {
        const row = await this.interestsRepository.findUserInterests(userId);
        if (!row) {
            return { selected: null };
        }

        return { selected: row.selected as InterestCode[] };
    }
}
