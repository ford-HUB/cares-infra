import { Controller, Delete, Get, Patch, Post } from '@nestjs/common';
import { ZBody, ZParam, ZQuery, ZSerialize } from 'nest-zod';
import { z } from 'zod';
import { PermissionKey } from 'src/infastructures/prisma/common/client';
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
 * Reading rights needs "View rights"; changing anything needs "Manage rights". Both
 * default to the admin baseline only, but either can be granted to another portal
 * account — or suspended on an admin — in Access Control itself.
 */
@Controller('v1/access-control')
@Roles(...PORTAL_ROLE_TYPES)
@RequirePermission(PermissionKey.ACCESS_CONTROL_VIEW)
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
  @RequirePermission(PermissionKey.ACCESS_CONTROL_MANAGE)
  @ResponseMessage('Access rights updated')
  @ZSerialize(AccessUserDetailSchema)
  async updateUserPermissions(
    @CurrentUser() caller: JwtPayload,
    @ZParam('id', UserIdParamSchema) id: string,
    @ZBody(UpdateUserPermissionsSchema) data: UpdateUserPermissionsDto,
    @RequestContext() context: RequestContextDto,
  ): Promise<AccessUserDetailDto> {
    return this.accessControlSiteService.updateUserPermissions(
      caller,
      id,
      data,
      context,
    );
  }

  @Post('users/:id/suspensions')
  @RequirePermission(PermissionKey.ACCESS_CONTROL_MANAGE)
  @ResponseMessage('Actions suspended')
  @ZSerialize(AccessUserDetailSchema)
  async suspendActions(
    @CurrentUser() caller: JwtPayload,
    @ZParam('id', UserIdParamSchema) id: string,
    @ZBody(SuspendActionsSchema) data: SuspendActionsDto,
    @RequestContext() context: RequestContextDto,
  ): Promise<AccessUserDetailDto> {
    return this.accessControlSiteService.suspendActions(
      caller,
      id,
      data,
      context,
    );
  }

  @Delete('users/:id/suspensions/:suspensionId')
  @RequirePermission(PermissionKey.ACCESS_CONTROL_MANAGE)
  @ResponseMessage('Suspension lifted')
  @ZSerialize(AccessUserDetailSchema)
  async liftSuspension(
    @CurrentUser() caller: JwtPayload,
    @ZParam('id', UserIdParamSchema) id: string,
    @ZParam('suspensionId', SuspensionIdParamSchema) suspensionId: string,
    @RequestContext() context: RequestContextDto,
  ): Promise<AccessUserDetailDto> {
    return this.accessControlSiteService.liftSuspension(
      caller,
      id,
      suspensionId,
      context,
    );
  }

  @Patch('roles/:roleType/permissions')
  @RequirePermission(PermissionKey.ACCESS_CONTROL_MANAGE)
  @ResponseMessage('Role baseline updated')
  @ZSerialize(RolePermissionsResponseSchema)
  async updateRolePermissions(
    @CurrentUser() caller: JwtPayload,
    @ZParam('roleType', PortalRoleSchema) roleType: PortalRoleType,
    @ZBody(UpdateRolePermissionsSchema) data: UpdateRolePermissionsDto,
    @RequestContext() context: RequestContextDto,
  ): Promise<RolePermissionsDto> {
    return this.accessControlSiteService.updateRolePermissions(
      caller,
      roleType,
      data,
      context,
    );
  }
}
