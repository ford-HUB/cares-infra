import { Controller, Delete, Get, HttpCode, Post, Put } from '@nestjs/common';
import { ZBody, ZParam, ZSerialize } from 'nest-zod';
import { CurrentUser } from 'src/shared/decorators/current-user-decorator';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import { MOBILE_PROFILE_ROLE_TYPES } from 'src/modules/profile/validators/profile-mobile-validator';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import type {
  ChangeEmailDto,
  ChangeEmailResponseDto,
  ChangePasswordDto,
  ChangePasswordResponseDto,
  OwnSessionsResponseDto,
  RevokeOwnSessionsResponseDto,
  SendEmailChangeOtpResponseDto,
  VerifyEmailChangeOtpDto,
  VerifyEmailChangeOtpResponseDto,
} from '../dto/account-settings-volunteer-dto';
import { AccountSettingsVolunteerService } from '../services/account-settings-volunteer-service';
import {
  ChangeEmailResponseSchema,
  ChangeEmailSchema,
  ChangePasswordResponseSchema,
  ChangePasswordSchema,
  OwnSessionsResponseSchema,
  RevokeOwnSessionsResponseSchema,
  SendEmailChangeOtpResponseSchema,
  SessionIdParamSchema,
  VerifyEmailChangeOtpResponseSchema,
  VerifyEmailChangeOtpSchema,
} from '../validators/account-settings-volunteer-validator';

/**
 * The app's Account Security screen. Shares `v1/account` with the admin controller;
 * the routes are all under `mobile/` so the two never collide.
 */
@Controller('v1/account/mobile')
@Roles(...MOBILE_PROFILE_ROLE_TYPES)
export class AccountSettingsVolunteerController {
  constructor(
    private readonly accountSettingsVolunteerService: AccountSettingsVolunteerService,
  ) {}

  @Post('email/send-code')
  @HttpCode(200)
  @ResponseMessage('Verification code sent')
  @ZSerialize(SendEmailChangeOtpResponseSchema)
  async sendEmailChangeOtp(
    @CurrentUser() user: JwtPayload,
  ): Promise<SendEmailChangeOtpResponseDto> {
    return this.accountSettingsVolunteerService.sendEmailChangeOtp(user);
  }

  @Post('email/verify-code')
  @HttpCode(200)
  @ResponseMessage('Code verified')
  @ZSerialize(VerifyEmailChangeOtpResponseSchema)
  async verifyEmailChangeOtp(
    @CurrentUser() user: JwtPayload,
    @ZBody(VerifyEmailChangeOtpSchema) body: VerifyEmailChangeOtpDto,
  ): Promise<VerifyEmailChangeOtpResponseDto> {
    return this.accountSettingsVolunteerService.verifyEmailChangeOtp(
      user,
      body.otp,
    );
  }

  @Put('email')
  @ResponseMessage('Email updated')
  @ZSerialize(ChangeEmailResponseSchema)
  async changeEmail(
    @CurrentUser() user: JwtPayload,
    @ZBody(ChangeEmailSchema) body: ChangeEmailDto,
  ): Promise<ChangeEmailResponseDto> {
    return this.accountSettingsVolunteerService.changeEmail(user, body);
  }

  @Put('password')
  @ResponseMessage('Password updated')
  @ZSerialize(ChangePasswordResponseSchema)
  async changePassword(
    @CurrentUser() user: JwtPayload,
    @ZBody(ChangePasswordSchema) body: ChangePasswordDto,
  ): Promise<ChangePasswordResponseDto> {
    return this.accountSettingsVolunteerService.changePassword(user, body);
  }

  @Get('sessions')
  @ResponseMessage('Connected devices')
  @ZSerialize(OwnSessionsResponseSchema)
  async listSessions(
    @CurrentUser() user: JwtPayload,
  ): Promise<OwnSessionsResponseDto> {
    return this.accountSettingsVolunteerService.listOwnSessions(user);
  }

  // Declared before `:sessionId` so the literal segment is never read as an id.
  @Delete('sessions/others')
  @ResponseMessage('Other devices signed out')
  @ZSerialize(RevokeOwnSessionsResponseSchema)
  async revokeOtherSessions(
    @CurrentUser() user: JwtPayload,
  ): Promise<RevokeOwnSessionsResponseDto> {
    return this.accountSettingsVolunteerService.revokeOtherSessions(user);
  }

  @Delete('sessions/:sessionId')
  @ResponseMessage('Device signed out')
  @ZSerialize(RevokeOwnSessionsResponseSchema)
  async revokeSession(
    @CurrentUser() user: JwtPayload,
    @ZParam('sessionId', SessionIdParamSchema) sessionId: string,
  ): Promise<RevokeOwnSessionsResponseDto> {
    return this.accountSettingsVolunteerService.revokeOwnSession(
      user,
      sessionId,
    );
  }
}
