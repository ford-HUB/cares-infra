import { Controller, Get, Post, StreamableFile } from '@nestjs/common';
import { ZParam, ZQuery, ZSerialize } from 'nest-zod';
import { z } from 'zod';
import { PermissionKey } from 'src/infastructures/prisma/common/client';
import { PORTAL_ROLE_TYPES } from 'src/shared/constants/portal-role-types';
import { CurrentUser } from 'src/shared/decorators/current-user-decorator';
import { RequirePermission } from 'src/shared/decorators/require-permission-decorator';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import type {
  ListUserRequestsQueryDto,
  UserRequestAttachmentKind,
  UserRequestDto,
  UserRequestListDto,
} from '../dto/user-requests-site-dto';
import { UserRequestsSiteService } from '../services/user-requests-site-service';
import {
  ListUserRequestsQuerySchema,
  UserRequestAttachmentKindSchema,
  UserRequestListResponseSchema,
  UserRequestResponseSchema,
} from '../validators/user-requests-site-validator';

const RequestIdParamSchema = z.uuid('A valid request id is required');

/** The queue lives under Users → Request in the portal, so it follows that page's gate. */
@Controller('v1/user-requests')
@Roles(...PORTAL_ROLE_TYPES)
@RequirePermission(PermissionKey.USERS_VIEW)
export class UserRequestsSiteController {
  constructor(
    private readonly userRequestsSiteService: UserRequestsSiteService,
  ) {}

  @Get()
  @ResponseMessage('User requests')
  @ZSerialize(UserRequestListResponseSchema)
  async list(
    @ZQuery(ListUserRequestsQuerySchema) query: ListUserRequestsQueryDto,
  ): Promise<UserRequestListDto> {
    return this.userRequestsSiteService.list(query);
  }

  @Get(':id/attachments/:kind')
  async getAttachment(
    @ZParam('id', RequestIdParamSchema) id: string,
    @ZParam('kind', UserRequestAttachmentKindSchema)
    kind: UserRequestAttachmentKind,
  ) {
    const asset = await this.userRequestsSiteService.getAttachment(id, kind);
    return new StreamableFile(asset.buffer, {
      type: asset.contentType,
      disposition: 'inline',
    });
  }

  @Post(':id/accept')
  @ResponseMessage('Request accepted')
  @ZSerialize(UserRequestResponseSchema)
  async accept(
    @ZParam('id', RequestIdParamSchema) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<UserRequestDto> {
    return this.userRequestsSiteService.accept(id, user.sub);
  }

  @Post(':id/remove')
  @ResponseMessage('Request removed')
  @ZSerialize(UserRequestResponseSchema)
  async remove(
    @ZParam('id', RequestIdParamSchema) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<UserRequestDto> {
    return this.userRequestsSiteService.remove(id, user.sub);
  }

  @Post(':id/restore')
  @ResponseMessage('Request restored')
  @ZSerialize(UserRequestResponseSchema)
  async restore(
    @ZParam('id', RequestIdParamSchema) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<UserRequestDto> {
    return this.userRequestsSiteService.restore(id, user.sub);
  }
}
