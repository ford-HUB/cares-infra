import { Controller, Delete, Get } from '@nestjs/common';
import { ZParam, ZQuery, ZSerialize } from 'nest-zod';
import { RoleType } from 'src/infastructures/prisma/common/client';
import {
  RequestContext,
  type RequestContextDto,
} from '../../../shared/decorators/request-context-decorator';
import { CurrentUser } from 'src/shared/decorators/current-user-decorator';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import type {
  ListSessionsQueryDto,
  RevokeSessionsDto,
  RevokeUserSessionsQueryDto,
  SessionsPageDto,
} from '../dto/sessions-site-dto';
import { SessionsSiteService } from '../services/sessions-site-service';
import {
  ListSessionsQuerySchema,
  RevokeSessionsResponseSchema,
  RevokeUserSessionsQuerySchema,
  SessionIdParamSchema,
  SessionsPageResponseSchema,
  SessionUserParamSchema,
} from '../validators/sessions-site-validator';

/** Every account's signed-in devices are visible here, so it stays admin-only. */
@Controller('v1/sessions')
@Roles(RoleType.ADMIN)
export class SessionsSiteController {
  constructor(private readonly sessionsSiteService: SessionsSiteService) {}

  @Get()
  @ResponseMessage('Active sessions')
  @ZSerialize(SessionsPageResponseSchema)
  async listSessions(
    @CurrentUser() caller: JwtPayload,
    @ZQuery(ListSessionsQuerySchema) query: ListSessionsQueryDto,
  ): Promise<SessionsPageDto> {
    return this.sessionsSiteService.listSessions(caller, query);
  }

  @Delete(':sessionId')
  @ResponseMessage('Session revoked')
  @ZSerialize(RevokeSessionsResponseSchema)
  async revokeSession(
    @CurrentUser() caller: JwtPayload,
    @ZParam('sessionId', SessionIdParamSchema) sessionId: string,
    @RequestContext() context: RequestContextDto,
  ): Promise<RevokeSessionsDto> {
    return this.sessionsSiteService.revokeSession(caller, sessionId, context);
  }

  @Delete('users/:userId')
  @ResponseMessage('Sessions revoked')
  @ZSerialize(RevokeSessionsResponseSchema)
  async revokeUserSessions(
    @CurrentUser() caller: JwtPayload,
    @ZParam('userId', SessionUserParamSchema) userId: string,
    @ZQuery(RevokeUserSessionsQuerySchema) query: RevokeUserSessionsQueryDto,
    @RequestContext() context: RequestContextDto,
  ): Promise<RevokeSessionsDto> {
    return this.sessionsSiteService.revokeUserSessions(
      caller,
      userId,
      query.keep_current,
      context,
    );
  }
}
