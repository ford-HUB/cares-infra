import { Body, Controller, Put } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user-decorator';
import { ResponseMessage } from '../../common/decorators/response-message-decorator';
import { Roles } from '../../common/decorators/roles-decorator';
import { PORTAL_ROLE_TYPES } from '../../common/constants/portal-role-types';
import { ZodValidationPipe } from '../../common/pipes/zod-validation-pipe';
import { JwtPayload } from '../../common/types/jwt-payload';
import {
    ChangeEmailDto,
    ChangePasswordDto,
} from './account-settings-dto';
import { AccountSettingsService } from './account-settings-service';
import {
    ChangeEmailSchema,
    ChangePasswordSchema,
} from './account-settings-validator';

@Controller('v1/account')
export class AccountSettingsController {
    constructor(private readonly accountSettingsService: AccountSettingsService) {}

    @Put('email')
    @Roles(...PORTAL_ROLE_TYPES)
    @ResponseMessage('Email updated')
    async changeEmail(
        @CurrentUser() user: JwtPayload,
        @Body(new ZodValidationPipe(ChangeEmailSchema)) data: ChangeEmailDto,
    ) {
        return this.accountSettingsService.changeEmail(user.sub, data);
    }

    @Put('password')
    @Roles(...PORTAL_ROLE_TYPES)
    @ResponseMessage('Password updated')
    async changePassword(
        @CurrentUser() user: JwtPayload,
        @Body(new ZodValidationPipe(ChangePasswordSchema)) data: ChangePasswordDto,
    ) {
        return this.accountSettingsService.changePassword(user.sub, data);
    }
}
