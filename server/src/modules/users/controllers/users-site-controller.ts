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
import { RoleType } from 'src/infastructures/prisma/common/client';
import { CurrentUser } from 'src/shared/decorators/current-user-decorator';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import type {
  BlockUserIpDto,
  ManagedUserDetailDto,
  ListUsersQueryDto,
  ManagedUserDto,
  ManagedUserListDto,
  RestrictUserDto,
} from '../dto/users-site-dto';
import { UsersSiteService } from '../services/users-site-service';
import {
  BlockUserIpSchema,
  ListUsersQuerySchema,
  ManagedUserDetailSchema,
  ManagedUserListResponseSchema,
  ManagedUserSchema,
  RestrictUserSchema,
} from '../validators/users-site-validator';

const UserIdParamSchema = z.uuid('A valid user id is required');

@Controller('v1/users')
@Roles(RoleType.ADMIN, RoleType.DIRECTOR)
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
  @ResponseMessage('User restricted')
  @ZSerialize(ManagedUserSchema)
  async restrictUser(
    @CurrentUser() caller: JwtPayload,
    @ZParam('id', UserIdParamSchema) id: string,
    @ZBody(RestrictUserSchema) data: RestrictUserDto,
  ): Promise<ManagedUserDto> {
    return this.usersSiteService.restrictUser(caller, id, data);
  }

  @Patch(':id/unrestrict')
  @ResponseMessage('Restriction lifted')
  @ZSerialize(ManagedUserSchema)
  async unrestrictUser(
    @CurrentUser() caller: JwtPayload,
    @ZParam('id', UserIdParamSchema) id: string,
  ): Promise<ManagedUserDto> {
    return this.usersSiteService.unrestrictUser(caller, id);
  }

  @Post(':id/block-ip')
  @ResponseMessage('IP address blocked')
  @ZSerialize(ManagedUserSchema)
  async blockUserIp(
    @CurrentUser() caller: JwtPayload,
    @ZParam('id', UserIdParamSchema) id: string,
    @ZBody(BlockUserIpSchema) data: BlockUserIpDto,
  ): Promise<ManagedUserDto> {
    return this.usersSiteService.blockUserIp(caller, id, data);
  }

  @Delete(':id/block-ip')
  @ResponseMessage('IP address unblocked')
  @ZSerialize(ManagedUserSchema)
  async unblockUserIp(
    @CurrentUser() caller: JwtPayload,
    @ZParam('id', UserIdParamSchema) id: string,
    @Query('ip_address') ipAddress?: string,
  ): Promise<ManagedUserDto> {
    return this.usersSiteService.unblockUserIp(caller, id, ipAddress);
  }
}
