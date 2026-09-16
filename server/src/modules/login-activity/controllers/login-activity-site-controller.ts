import { Controller, Get } from '@nestjs/common';
import { ZQuery, ZSerialize } from 'nest-zod';
import { PermissionKey } from 'src/infastructures/prisma/common/client';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import { RequirePermission } from 'src/shared/decorators/require-permission-decorator';
import { PORTAL_ROLE_TYPES } from 'src/shared/constants/portal-role-types';
import type {
  ListLoginActivityQueryDto,
  LoginActivityPageDto,
} from '../dto/login-activity-site-dto';
import { LoginActivitySiteService } from '../services/login-activity-site-service';
import {
  ListLoginActivityQuerySchema,
  LoginActivityPageResponseSchema,
} from '../validators/login-activity-site-validator';

/** The sign-in trail exposes every account's IPs, so it stays admin-only. */
@Controller('v1/login-activity')
@Roles(...PORTAL_ROLE_TYPES)
@RequirePermission(PermissionKey.SECURITY_AUDIT_VIEW)
export class LoginActivitySiteController {
  constructor(
    private readonly loginActivitySiteService: LoginActivitySiteService,
  ) {}

  @Get()
  @ResponseMessage('Login activity')
  @ZSerialize(LoginActivityPageResponseSchema)
  async listActivity(
    @ZQuery(ListLoginActivityQuerySchema) query: ListLoginActivityQueryDto,
  ): Promise<LoginActivityPageDto> {
    return this.loginActivitySiteService.listActivity(query);
  }
}
