import { AuthSiteService } from "../services/auth-site-service";
import {
    Body,
    Controller,
    Get,
    HttpCode,
    Post,
} from "@nestjs/common";
import { LoginSchema } from "../validators/auth-site-validator";
import { ZodValidationPipe } from "src/common/pipes/zod-validation-pipe";
import { LoginDto } from "../dto/auth-site-dto";
import { ResponseMessage } from "src/common/decorators/response-message-decorator";
import { Public } from "src/common/decorators/public-decorator";
import { Roles } from "src/common/decorators/roles-decorator";
import { CurrentUser } from "src/common/decorators/current-user-decorator";
import { PORTAL_ROLE_TYPES } from "src/common/constants/portal-role-types";
import { JwtPayload } from "src/common/types/jwt-payload";

@Controller('v1/auth')
export class AuthSiteController {
    constructor(private readonly authSiteService: AuthSiteService) {}

    @Post('admin/login')
    @Public()
    @HttpCode(200)
    @ResponseMessage('Admin login successful')
    async adminLogin(@Body(new ZodValidationPipe(LoginSchema)) data: LoginDto) {
        return await this.authSiteService.adminLogin(data);
    }

    @Get('me')
    @Roles(...PORTAL_ROLE_TYPES)
    @ResponseMessage('Session profile')
    async me(@CurrentUser() user: JwtPayload) {
        return await this.authSiteService.getMe(user);
    }
}
