import { Body, Controller, ForbiddenException, Get, Param, Put } from "@nestjs/common";
import { ResponseMessage } from "src/common/decorators/response-message-decorator";
import { Public } from "src/common/decorators/public-decorator";
import { Roles } from "src/common/decorators/roles-decorator";
import { CurrentUser } from "src/common/decorators/current-user-decorator";
import { isPortalRole, PORTAL_ROLE_TYPES } from "src/common/constants/portal-role-types";
import { ZodValidationPipe } from "src/common/pipes/zod-validation-pipe";
import { RoleType } from "../../../infastructures/prisma/common/client";
import { JwtPayload } from "src/common/types/jwt-payload";
import { SaveUserInterestsDto } from "../dto/interests-mobile-dto";
import { InterestsMobileService } from "../services/interests-mobile-service";
import { SaveUserInterestsSchema, UserIdParamSchema } from "../validators/interests-mobile-validator";

@Controller("v1/interests")
export class InterestsMobileController {
    constructor(private readonly interestsMobileService: InterestsMobileService) {}

    @Get()
    @Public()
    @ResponseMessage("Interest catalog")
    async listInterests() {
        return this.interestsMobileService.listInterests();
    }

    @Put()
    @Roles(RoleType.VOLUNTEER)
    @ResponseMessage("Interests saved")
    async saveUserInterests(
        @CurrentUser() user: JwtPayload,
        @Body(new ZodValidationPipe(SaveUserInterestsSchema)) data: SaveUserInterestsDto,
    ) {
        return this.interestsMobileService.saveUserInterests(user.sub, data.selected);
    }

    @Get(":userId")
    @Roles(RoleType.VOLUNTEER, ...PORTAL_ROLE_TYPES)
    @ResponseMessage("User interests")
    async getUserInterests(
        @CurrentUser() user: JwtPayload,
        @Param(new ZodValidationPipe(UserIdParamSchema)) params: { userId: string },
    ) {
        if (!isPortalRole(user.role_type) && user.sub !== params.userId) {
            throw new ForbiddenException("You can only view your own interests");
        }

        return this.interestsMobileService.getUserInterests(params.userId);
    }
}
