import { AuthSiteService } from '../services/auth-site-service';
import { Controller, Get, HttpCode, Ip, Post } from '@nestjs/common';
import { ZBody, ZSerialize } from 'nest-zod';
import {
  AdminLoginResponseSchema,
  LoginSchema,
  MeResponseSchema,
} from '../validators/auth-site-validator';
import type {
  AdminLoginResponseDto,
  LoginDto,
  MeResponseDto,
} from '../dto/auth-site-dto';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Public } from 'src/shared/decorators/public-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import { CurrentUser } from 'src/shared/decorators/current-user-decorator';
import { PORTAL_ROLE_TYPES } from 'src/shared/constants/portal-role-types';
import type { JwtPayload } from 'src/shared/types/jwt-payload';

@Controller('v1/auth')
export class AuthSiteController {
  constructor(private readonly authSiteService: AuthSiteService) {}

  @Post('admin/login')
  @Public()
  @HttpCode(200)
  @ResponseMessage('Admin login successful')
  @ZSerialize(AdminLoginResponseSchema)
  async adminLogin(
    @ZBody(LoginSchema) data: LoginDto,
    @Ip() ipAddress: string,
  ): Promise<AdminLoginResponseDto> {
    return await this.authSiteService.adminLogin(data, ipAddress);
  }

  @Get('me')
  @Roles(...PORTAL_ROLE_TYPES)
  @ResponseMessage('Session profile')
  @ZSerialize(MeResponseSchema)
  async me(@CurrentUser() user: JwtPayload): Promise<MeResponseDto> {
    return await this.authSiteService.getMe(user);
  }
}
