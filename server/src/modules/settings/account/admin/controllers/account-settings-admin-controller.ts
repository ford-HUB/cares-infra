import { Controller, Put } from '@nestjs/common';
import { ZBody, ZSerialize } from 'nest-zod';
import { CurrentUser } from 'src/shared/decorators/current-user-decorator';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import { PORTAL_ROLE_TYPES } from 'src/shared/constants/portal-role-types';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import type {
  ChangeEmailDto,
  ChangeEmailResponseDto,
  ChangePasswordDto,
  ChangePasswordResponseDto,
} from '../dto/account-settings-admin-dto';
import { AccountSettingsAdminService } from '../services/account-settings-admin-service';
import {
  ChangeEmailResponseSchema,
  ChangeEmailSchema,
  ChangePasswordResponseSchema,
  ChangePasswordSchema,
} from '../validators/account-settings-admin-validator';

@Controller('v1/account')
export class AccountSettingsAdminController {
  constructor(
    private readonly accountSettingsAdminService: AccountSettingsAdminService,
  ) {}

  @Put('email')
  @Roles(...PORTAL_ROLE_TYPES)
  @ResponseMessage('Email updated')
  @ZSerialize(ChangeEmailResponseSchema)
  async changeEmail(
    @CurrentUser() user: JwtPayload,
    @ZBody(ChangeEmailSchema) data: ChangeEmailDto,
  ): Promise<ChangeEmailResponseDto> {
    return this.accountSettingsAdminService.changeEmail(user.sub, data);
  }

  @Put('password')
  @Roles(...PORTAL_ROLE_TYPES)
  @ResponseMessage('Password updated')
  @ZSerialize(ChangePasswordResponseSchema)
  async changePassword(
    @CurrentUser() user: JwtPayload,
    @ZBody(ChangePasswordSchema) data: ChangePasswordDto,
  ): Promise<ChangePasswordResponseDto> {
    return this.accountSettingsAdminService.changePassword(user.sub, data);
  }
}
