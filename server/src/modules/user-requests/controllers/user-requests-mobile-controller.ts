import { Controller, Get, Post } from '@nestjs/common';
import { ZBody, ZSerialize } from 'nest-zod';
import { CurrentUser } from 'src/shared/decorators/current-user-decorator';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import type {
  CreateEventJoinRequestDto,
  CreateRoleAccessRequestDto,
  MobileUserRequestDto,
  MobileUserRequestListDto,
} from '../dto/user-requests-mobile-dto';
import { UserRequestsMobileService } from '../services/user-requests-mobile-service';
import {
  CreateEventJoinRequestSchema,
  CreateRoleAccessRequestSchema,
  MOBILE_USER_REQUEST_ROLE_TYPES,
  MobileUserRequestListResponseSchema,
  MobileUserRequestResponseSchema,
} from '../validators/user-requests-mobile-validator';

/**
 * The requester's side. Shares `v1/user-requests` with the portal controller;
 * every route here sits under `me/` so the two never collide.
 */
@Controller('v1/user-requests')
@Roles(...MOBILE_USER_REQUEST_ROLE_TYPES)
export class UserRequestsMobileController {
  constructor(
    private readonly userRequestsMobileService: UserRequestsMobileService,
  ) {}

  @Get('me')
  @ResponseMessage('Your requests')
  @ZSerialize(MobileUserRequestListResponseSchema)
  async listMine(
    @CurrentUser() user: JwtPayload,
  ): Promise<MobileUserRequestListDto> {
    return this.userRequestsMobileService.listMine(user.sub);
  }

  @Post('me/role-access')
  @ResponseMessage('Your request is under review')
  @ZSerialize(MobileUserRequestResponseSchema)
  async requestRoleAccess(
    @ZBody(CreateRoleAccessRequestSchema) body: CreateRoleAccessRequestDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<MobileUserRequestDto> {
    return this.userRequestsMobileService.createRoleAccess(
      user.sub,
      user.role_type,
      body,
    );
  }

  @Post('me/event-join')
  @ResponseMessage('Your request to join the event is under review')
  @ZSerialize(MobileUserRequestResponseSchema)
  async requestEventJoin(
    @ZBody(CreateEventJoinRequestSchema) body: CreateEventJoinRequestDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<MobileUserRequestDto> {
    return this.userRequestsMobileService.createEventJoin(
      user.sub,
      user.role_type,
      body,
    );
  }
}
