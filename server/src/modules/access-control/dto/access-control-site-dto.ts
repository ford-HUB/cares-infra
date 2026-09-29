import { z } from 'zod';
import type { PermissionKey } from '../../../infastructures/prisma/common/client';
import {
  AccessCatalogResponseSchema,
  AccessUserDetailSchema,
  AccessUserListResponseSchema,
  AccessUserSchema,
  ActionSuspensionSchema,
  ListAccessUsersQuerySchema,
  RolePermissionsResponseSchema,
  SessionSuspensionSchema,
  SuspendActionsSchema,
  UpdateRolePermissionsSchema,
  UpdateUserPermissionsSchema,
} from '../validators/access-control-site-validator';

export type ListAccessUsersQueryDto = z.infer<
  typeof ListAccessUsersQuerySchema
>;
export type UpdateUserPermissionsDto = z.infer<
  typeof UpdateUserPermissionsSchema
>;
export type UpdateRolePermissionsDto = z.infer<
  typeof UpdateRolePermissionsSchema
>;
export type SuspendActionsDto = z.infer<typeof SuspendActionsSchema>;

export type AccessCatalogDto = z.infer<typeof AccessCatalogResponseSchema>;
export type RolePermissionsDto = z.infer<typeof RolePermissionsResponseSchema>;
export type AccessUserDto = z.infer<typeof AccessUserSchema>;
export type AccessUserListDto = z.infer<typeof AccessUserListResponseSchema>;
export type AccessUserDetailDto = z.infer<typeof AccessUserDetailSchema>;
export type ActionSuspensionDto = z.infer<typeof ActionSuspensionSchema>;
export type SessionSuspensionDto = z.infer<typeof SessionSuspensionSchema>;

/** The rights a signed-in account holds now, plus the suspensions that shaped them. */
export interface SessionRightsDto {
  permissions: PermissionKey[];
  suspensions: SessionSuspensionDto[];
}
