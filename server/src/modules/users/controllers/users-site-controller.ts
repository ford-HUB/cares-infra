import {
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { ZBody, ZParam, ZQuery, ZSerialize } from 'nest-zod';
import { z } from 'zod';
import {
  PermissionKey,
  RoleType,
} from 'src/infastructures/prisma/common/client';
import { CurrentUser } from 'src/shared/decorators/current-user-decorator';
import {
  RequestContext,
  type RequestContextDto,
} from 'src/shared/decorators/request-context-decorator';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import { RequirePermission } from 'src/shared/decorators/require-permission-decorator';
import { PORTAL_ROLE_TYPES } from 'src/shared/constants/portal-role-types';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import type {
  BlockUserIpDto,
  CheckProvisionEmailDto,
  ManagedUserDetailDto,
  ListUsersQueryDto,
  ManagedUserDto,
  ManagedUserListDto,
  ProvisionEmailCheckDto,
  ProvisionUserDto,
  ProvisionedUserDto,
  ReissueCredentialsDto,
  RestrictUserDto,
} from '../dto/users-site-dto';
import { UsersSiteService } from '../services/users-site-service';
import {
  BlockUserIpSchema,
  CheckProvisionEmailSchema,
  ListUsersQuerySchema,
  ManagedUserDetailSchema,
  ManagedUserListResponseSchema,
  ManagedUserSchema,
  ProvisionedUserResponseSchema,
  ProvisionEmailCheckResponseSchema,
  ProvisionUserSchema,
  ReissueCredentialsSchema,
  RestrictUserSchema,
} from '../validators/users-site-validator';

const UserIdParamSchema = z.uuid('A valid user id is required');

@Controller('v1/users')
@Roles(...PORTAL_ROLE_TYPES)
@RequirePermission(PermissionKey.USERS_VIEW)
export class UsersSiteController {
  constructor(private readonly usersSiteService: UsersSiteService) {}

  @Get()
  @ResponseMessage('Users')
  @ZSerialize(ManagedUserListResponseSchema)
  async listUsers(
    @CurrentUser() caller: JwtPayload,
    @ZQuery(ListUsersQuerySchema) query: ListUsersQueryDto,
  ): Promise<ManagedUserListDto> {
    return this.usersSiteService.listUsers(caller, query);
  }

  /**
   * Creating an account is an admin-only act: a director asks for one, an
   * administrator issues it. The method-level `@Roles` narrows the class default.
   */
  @Post()
  @Roles(RoleType.ADMIN)
  @ResponseMessage('Account created')
  @ZSerialize(ProvisionedUserResponseSchema)
  async provisionUser(
    @CurrentUser() caller: JwtPayload,
    @ZBody(ProvisionUserSchema) data: ProvisionUserDto,
    @RequestContext() context: RequestContextDto,
  ): Promise<ProvisionedUserDto> {
    return this.usersSiteService.provisionUser(caller, data, context);
  }

  /**
   * Pre-validates the inbox the add-user form will mail credentials to, so a typo is
   * caught while the field still has focus rather than after the account exists.
   * Declared before the `:id` routes so the literal segment wins the match.
   */
  @Post('check-email')
  @Roles(RoleType.ADMIN)
  @ResponseMessage('Email checked')
  @ZSerialize(ProvisionEmailCheckResponseSchema)
  async checkProvisionEmail(
    @ZBody(CheckProvisionEmailSchema) data: CheckProvisionEmailDto,
  ): Promise<ProvisionEmailCheckDto> {
    return this.usersSiteService.checkRecipientEmail(data.email);
  }

  @Post(':id/reissue-credentials')
  @Roles(RoleType.ADMIN)
  @ResponseMessage('New credentials issued')
  @ZSerialize(ProvisionedUserResponseSchema)
  async reissueCredentials(
    @CurrentUser() caller: JwtPayload,
    @ZParam('id', UserIdParamSchema) id: string,
    @ZBody(ReissueCredentialsSchema) data: ReissueCredentialsDto,
    @RequestContext() context: RequestContextDto,
  ): Promise<ProvisionedUserDto> {
    return this.usersSiteService.reissueCredentials(caller, id, data, context);
  }

  @Get(':id')
  @ResponseMessage('User details')
  @ZSerialize(ManagedUserDetailSchema)
  async getUserDetail(
    @CurrentUser() caller: JwtPayload,
    @ZParam('id', UserIdParamSchema) id: string,
  ): Promise<ManagedUserDetailDto> {
    return this.usersSiteService.getUserDetail(caller, id);
  }

  @Get(':id/avatar')
  async getUserAvatar(
    @CurrentUser() caller: JwtPayload,
    @ZParam('id', UserIdParamSchema) id: string,
  ) {
    const asset = await this.usersSiteService.getUserAsset(
      caller,
      id,
      'avatar',
    );
    return new StreamableFile(asset.buffer, {
      type: asset.contentType,
      disposition: 'inline',
    });
  }

  @Get(':id/signature')
  async getUserSignature(
    @CurrentUser() caller: JwtPayload,
    @ZParam('id', UserIdParamSchema) id: string,
  ) {
    const asset = await this.usersSiteService.getUserAsset(
      caller,
      id,
      'signature',
    );
    return new StreamableFile(asset.buffer, {
      type: asset.contentType,
      disposition: 'inline',
    });
  }

  @Patch(':id/restrict')
  @RequirePermission(PermissionKey.USERS_RESTRICT)
  @ResponseMessage('User restricted')
  @ZSerialize(ManagedUserSchema)
  async restrictUser(
    @CurrentUser() caller: JwtPayload,
    @ZParam('id', UserIdParamSchema) id: string,
    @ZBody(RestrictUserSchema) data: RestrictUserDto,
    @RequestContext() context: RequestContextDto,
  ): Promise<ManagedUserDto> {
    return this.usersSiteService.restrictUser(caller, id, data, context);
  }

  @Patch(':id/unrestrict')
  @RequirePermission(PermissionKey.USERS_RESTRICT)
  @ResponseMessage('Restriction lifted')
  @ZSerialize(ManagedUserSchema)
  async unrestrictUser(
    @CurrentUser() caller: JwtPayload,
    @ZParam('id', UserIdParamSchema) id: string,
    @RequestContext() context: RequestContextDto,
  ): Promise<ManagedUserDto> {
    return this.usersSiteService.unrestrictUser(caller, id, context);
  }

  @Post(':id/block-ip')
  @RequirePermission(PermissionKey.USERS_BLOCK_IP)
  @ResponseMessage('IP address blocked')
  @ZSerialize(ManagedUserSchema)
  async blockUserIp(
    @CurrentUser() caller: JwtPayload,
    @ZParam('id', UserIdParamSchema) id: string,
    @ZBody(BlockUserIpSchema) data: BlockUserIpDto,
    @RequestContext() context: RequestContextDto,
  ): Promise<ManagedUserDto> {
    return this.usersSiteService.blockUserIp(caller, id, data, context);
  }

  @Delete(':id/block-ip')
  @RequirePermission(PermissionKey.USERS_BLOCK_IP)
  @ResponseMessage('IP address unblocked')
  @ZSerialize(ManagedUserSchema)
  async unblockUserIp(
    @CurrentUser() caller: JwtPayload,
    @ZParam('id', UserIdParamSchema) id: string,
    @RequestContext() context: RequestContextDto,
    @Query('ip_address') ipAddress?: string,
  ): Promise<ManagedUserDto> {
    return this.usersSiteService.unblockUserIp(caller, id, ipAddress, context);
  }
}
