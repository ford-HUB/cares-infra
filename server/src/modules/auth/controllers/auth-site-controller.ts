import { AuthSiteService } from '../services/auth-site-service';
import {
  Controller,
  Get,
  Headers,
  HttpCode,
  Ip,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ZBody, ZSerialize } from 'nest-zod';
import {
  ACCESS_REQUEST_MAX_FILES,
  AccessRequestResponseSchema,
  AccessRequestSchema,
  AdminLoginResponseSchema,
  LoginSchema,
  MeResponseSchema,
} from '../validators/auth-site-validator';
import type {
  AccessRequestDto,
  AccessRequestResponseDto,
  AdminLoginResponseDto,
  LoginDto,
  MeResponseDto,
} from '../dto/auth-site-dto';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Public } from 'src/shared/decorators/public-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import {
  RequestContext,
  type RequestContextDto,
} from 'src/shared/decorators/request-context-decorator';
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
    @Headers('user-agent') userAgent?: string,
  ): Promise<AdminLoginResponseDto> {
    return await this.authSiteService.adminLogin(data, ipAddress, userAgent);
  }

  @Post('admin/logout')
  @Roles(...PORTAL_ROLE_TYPES)
  @HttpCode(200)
  @ResponseMessage('Signed out')
  async adminLogout(
    @CurrentUser() user: JwtPayload,
    @RequestContext() context: RequestContextDto,
  ): Promise<void> {
    await this.authSiteService.logout(user, context);
  }

  @Post('access-request')
  @Public()
  @HttpCode(200)
  @ResponseMessage('Access request sent')
  @ZSerialize(AccessRequestResponseSchema)
  @UseInterceptors(FilesInterceptor('attachments', ACCESS_REQUEST_MAX_FILES))
  async submitAccessRequest(
    @ZBody(AccessRequestSchema) data: AccessRequestDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ): Promise<AccessRequestResponseDto> {
    return await this.authSiteService.submitAccessRequest(data, files);
  }

  @Get('me')
  @Roles(...PORTAL_ROLE_TYPES)
  @ResponseMessage('Session profile')
  @ZSerialize(MeResponseSchema)
  async me(@CurrentUser() user: JwtPayload): Promise<MeResponseDto> {
    return await this.authSiteService.getMe(user);
  }
}
