import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ZBody, ZQuery, ZSerialize } from 'nest-zod';
import { CurrentUser } from 'src/shared/decorators/current-user-decorator';
import {
  RequestContext,
  type RequestContextDto,
} from 'src/shared/decorators/request-context-decorator';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import { MOBILE_PROFILE_ROLE_TYPES } from 'src/modules/profile/validators/profile-mobile-validator';
import type {
  ActivityLogPageDto,
  ListMyActivityQueryDto,
  RecordClientActivityDto,
} from '../dto/audit-logs-mobile-dto';
import { AuditLogsMobileService } from '../services/audit-logs-mobile-service';
import {
  ActivityLogPageResponseSchema,
  ListMyActivityQuerySchema,
  RecordClientActivitySchema,
} from '../validators/audit-logs-mobile-validator';

/**
 * The account holder's own trail. Scoped to the caller by the token — there is no
 * user id parameter, so one account can never page through another's activity.
 */
@Controller('v1/audit-logs')
export class AuditLogsMobileController {
  constructor(
    private readonly auditLogsMobileService: AuditLogsMobileService,
  ) {}

  @Get('me')
  @Roles(...MOBILE_PROFILE_ROLE_TYPES)
  @ResponseMessage('Activity logs')
  @ZSerialize(ActivityLogPageResponseSchema)
  async listMyActivity(
    @CurrentUser() user: JwtPayload,
    @ZQuery(ListMyActivityQuerySchema) query: ListMyActivityQueryDto,
  ): Promise<ActivityLogPageDto> {
    return this.auditLogsMobileService.listMyActivity(user.sub, query);
  }

  /** Device-side actions (role switch/unlock) the app reports to keep the trail whole. */
  @Post('me/activity')
  @HttpCode(200)
  @Roles(...MOBILE_PROFILE_ROLE_TYPES)
  @ResponseMessage('Activity recorded')
  async recordClientActivity(
    @CurrentUser() user: JwtPayload,
    @ZBody(RecordClientActivitySchema) body: RecordClientActivityDto,
    @RequestContext() context: RequestContextDto,
  ): Promise<void> {
    await this.auditLogsMobileService.recordClientActivity(user, body, context);
  }
}
