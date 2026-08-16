import { z } from 'zod';
import {
  AccessCatalogResponseSchema,
  AccessUserDetailSchema,
  AccessUserListResponseSchema,
  AccessUserSchema,
  ActionSuspensionSchema,
  ListAccessUsersQuerySchema,
  RolePermissionsResponseSchema,
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
