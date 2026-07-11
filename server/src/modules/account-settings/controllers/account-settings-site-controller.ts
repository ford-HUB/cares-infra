import { Body, Controller, Put } from '@nestjs/common';
import { CurrentUser } from 'src/common/decorators/current-user-decorator';
import { ResponseMessage } from 'src/common/decorators/response-message-decorator';
import { Roles } from 'src/common/decorators/roles-decorator';
import { PORTAL_ROLE_TYPES } from 'src/common/constants/portal-role-types';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation-pipe';
import { JwtPayload } from 'src/common/types/jwt-payload';
import {
    ChangeEmailDto,
    ChangePasswordDto,
} from '../dto/account-settings-site-dto';
import { AccountSettingsSiteService } from '../services/account-settings-site-service';
import {
    ChangeEmailSchema,
    ChangePasswordSchema,
} from '../validators/account-settings-site-validator';

@Controller('v1/account')
export class AccountSettingsSiteController {
    constructor(private readonly accountSettingsSiteService: AccountSettingsSiteService) {}

    @Put('email')
    @Roles(...PORTAL_ROLE_TYPES)
    @ResponseMessage('Email updated')
    async changeEmail(
        @CurrentUser() user: JwtPayload,
        @Body(new ZodValidationPipe(ChangeEmailSchema)) data: ChangeEmailDto,
    ) {
        return this.accountSettingsSiteService.changeEmail(user.sub, data);
    }

    @Put('password')
    @Roles(...PORTAL_ROLE_TYPES)
    @ResponseMessage('Password updated')
    async changePassword(
        @CurrentUser() user: JwtPayload,
        @Body(new ZodValidationPipe(ChangePasswordSchema)) data: ChangePasswordDto,
    ) {
        return this.accountSettingsSiteService.changePassword(user.sub, data);
    }
}
