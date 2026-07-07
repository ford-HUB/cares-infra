import { Body, Controller, ForbiddenException, Get, Param, Put } from "@nestjs/common";
import { ResponseMessage } from "src/common/decorators/response-message-decorator";
import { Public } from "src/common/decorators/public-decorator";
import { Roles } from "src/common/decorators/roles-decorator";
import { CurrentUser } from "src/common/decorators/current-user-decorator";
import { isPortalRole, PORTAL_ROLE_TYPES } from "src/common/constants/portal-role-types";
import { ZodValidationPipe } from "src/common/pipes/zod-validation-pipe";
import { RoleType } from "../../infastructures/prisma/common/client";
import { JwtPayload } from "src/common/types/jwt-payload";
import { SaveUserInterestsDto } from "./onboarding-dto";
import { OnboardingService } from "./onboarding-service";
import { SaveUserInterestsSchema, UserIdParamSchema } from "./onboarding-validator";

@Controller("v1/onboarding")
export class OnboardingController {
    constructor(private readonly onboardingService: OnboardingService) {}

    @Get("interests")
    @Public()
    @ResponseMessage("Interest catalog")
    async listInterests() {
        return this.onboardingService.listInterests();
    }

    @Put("interests")
    @Roles(RoleType.VOLUNTEER)
    @ResponseMessage("Interests saved")
    async saveUserInterests(
        @CurrentUser() user: JwtPayload,
        @Body(new ZodValidationPipe(SaveUserInterestsSchema)) data: SaveUserInterestsDto,
    ) {
        return this.onboardingService.saveUserInterests(user.sub, data.selected);
    }

    @Get("interests/:userId")
    @Roles(RoleType.VOLUNTEER, ...PORTAL_ROLE_TYPES)
    @ResponseMessage("User interests")
    async getUserInterests(
        @CurrentUser() user: JwtPayload,
        @Param(new ZodValidationPipe(UserIdParamSchema)) params: { userId: string },
    ) {
        if (!isPortalRole(user.role_type) && user.sub !== params.userId) {
            throw new ForbiddenException("You can only view your own interests");
        }

        return this.onboardingService.getUserInterests(params.userId);
    }
}
