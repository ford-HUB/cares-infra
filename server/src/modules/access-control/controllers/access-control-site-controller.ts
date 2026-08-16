import { Controller, Delete, Get, Patch, Post } from '@nestjs/common';
import { ZBody, ZParam, ZQuery, ZSerialize } from 'nest-zod';
import { z } from 'zod';
import { RoleType } from 'src/infastructures/prisma/common/client';
import { CurrentUser } from 'src/shared/decorators/current-user-decorator';
import { ResponseMessage } from 'src/shared/decorators/response-message-decorator';
import { Roles } from 'src/shared/decorators/roles-decorator';
import type { JwtPayload } from 'src/shared/types/jwt-payload';
import type { PortalRoleType } from 'src/shared/constants/portal-role-types';
import type {
  AccessCatalogDto,
  AccessUserDetailDto,
  AccessUserListDto,
  ListAccessUsersQueryDto,
  RolePermissionsDto,
  SuspendActionsDto,
  UpdateRolePermissionsDto,
  UpdateUserPermissionsDto,
} from '../dto/access-control-site-dto';
import { AccessControlSiteService } from '../services/access-control-site-service';
import {
  AccessCatalogResponseSchema,
  AccessUserDetailSchema,
  AccessUserListResponseSchema,
  ListAccessUsersQuerySchema,
  PortalRoleSchema,
  RolePermissionsResponseSchema,
  SuspendActionsSchema,
  UpdateRolePermissionsSchema,
  UpdateUserPermissionsSchema,
} from '../validators/access-control-site-validator';

const UserIdParamSchema = z.uuid('A valid user id is required');
const SuspensionIdParamSchema = z.uuid('A valid suspension id is required');

/**
 * Admin only. Directors manage accounts through `v1/users`, but deciding what a role
 * or a person is allowed to do is a system-operator concern.
 */
@Controller('v1/access-control')
@Roles(RoleType.ADMIN)
export class AccessControlSiteController {
  constructor(
    private readonly accessControlSiteService: AccessControlSiteService,
  ) {}

  @Get('catalog')
  @ResponseMessage('Permission catalog')
  @ZSerialize(AccessCatalogResponseSchema)
  async getCatalog(): Promise<AccessCatalogDto> {
    return this.accessControlSiteService.getCatalog();
  }

  @Get('users')
  @ResponseMessage('Access control users')
  @ZSerialize(AccessUserListResponseSchema)
  async listUsers(
    @ZQuery(ListAccessUsersQuerySchema) query: ListAccessUsersQueryDto,
  ): Promise<AccessUserListDto> {
    return this.accessControlSiteService.listUsers(query);
  }

  @Get('users/:id')
  @ResponseMessage('Access rights')
  @ZSerialize(AccessUserDetailSchema)
  async getUserDetail(
    @ZParam('id', UserIdParamSchema) id: string,
  ): Promise<AccessUserDetailDto> {
    return this.accessControlSiteService.getUserDetail(id);
  }

  @Patch('users/:id/permissions')
  @ResponseMessage('Access rights updated')
  @ZSerialize(AccessUserDetailSchema)
  async updateUserPermissions(
    @CurrentUser() caller: JwtPayload,
    @ZParam('id', UserIdParamSchema) id: string,
    @ZBody(UpdateUserPermissionsSchema) data: UpdateUserPermissionsDto,
  ): Promise<AccessUserDetailDto> {
    return this.accessControlSiteService.updateUserPermissions(
      caller,
      id,
      data,
    );
  }

  @Post('users/:id/suspensions')
  @ResponseMessage('Actions suspended')
  @ZSerialize(AccessUserDetailSchema)
  async suspendActions(
    @CurrentUser() caller: JwtPayload,
    @ZParam('id', UserIdParamSchema) id: string,
    @ZBody(SuspendActionsSchema) data: SuspendActionsDto,
  ): Promise<AccessUserDetailDto> {
    return this.accessControlSiteService.suspendActions(caller, id, data);
  }

  @Delete('users/:id/suspensions/:suspensionId')
  @ResponseMessage('Suspension lifted')
  @ZSerialize(AccessUserDetailSchema)
  async liftSuspension(
    @CurrentUser() caller: JwtPayload,
    @ZParam('id', UserIdParamSchema) id: string,
    @ZParam('suspensionId', SuspensionIdParamSchema) suspensionId: string,
  ): Promise<AccessUserDetailDto> {
    return this.accessControlSiteService.liftSuspension(
      caller,
      id,
      suspensionId,
    );
  }

  @Patch('roles/:roleType/permissions')
  @ResponseMessage('Role baseline updated')
  @ZSerialize(RolePermissionsResponseSchema)
  async updateRolePermissions(
    @CurrentUser() caller: JwtPayload,
    @ZParam('roleType', PortalRoleSchema) roleType: PortalRoleType,
    @ZBody(UpdateRolePermissionsSchema) data: UpdateRolePermissionsDto,
  ): Promise<RolePermissionsDto> {
    return this.accessControlSiteService.updateRolePermissions(
      caller,
      roleType,
      data,
    );
  }
}
