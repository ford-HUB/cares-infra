import { z } from 'zod';
import {
  PermissionKey,
  PermissionOverrideEffect,
  RoleType,
} from '../../../infastructures/prisma/common/client';
import { PORTAL_ROLE_TYPES } from '../../../shared/constants/portal-role-types';

export const ACCESS_LIST_DEFAULT_PAGE_SIZE = 25;
export const ACCESS_LIST_MAX_PAGE_SIZE = 100;

/** Only the portal roles carry rights — the app-side roles are never listed here. */
export const PortalRoleSchema = z.enum(PORTAL_ROLE_TYPES);

export const AccessRightsFilterSchema = z.enum([
  'all',
  'customised',
  'suspended',
]);

export const ListAccessUsersQuerySchema = z
  .object({
    search: z.string().trim().max(120).optional(),
    role: z.union([z.literal('all'), PortalRoleSchema]).default('all'),
    rights: AccessRightsFilterSchema.default('all'),
    page: z.coerce.number().int().min(1).default(1),
    page_size: z.coerce
      .number()
      .int()
      .min(1)
      .max(ACCESS_LIST_MAX_PAGE_SIZE)
      .default(ACCESS_LIST_DEFAULT_PAGE_SIZE),
  })
  .strict();

/**
 * The portal sends the full set of actions the user should end up with. The server
 * diffs it against the role baseline and stores only the departures, so a baseline
 * change later still flows through to users who never had an override.
 */
export const UpdateUserPermissionsSchema = z
  .object({
    permissions: z
      .array(z.enum(PermissionKey))
      .max(Object.keys(PermissionKey).length),
    reason: z.string().trim().max(500).optional(),
  })
  .strict();

export const UpdateRolePermissionsSchema = z
  .object({
    permissions: z
      .array(z.enum(PermissionKey))
      .max(Object.keys(PermissionKey).length),
  })
  .strict();

export const SuspendActionsSchema = z
  .object({
    permissions: z
      .array(z.enum(PermissionKey))
      .min(1, 'Select at least one action to suspend'),
    reason: z
      .string()
      .trim()
      .min(1, 'A reason is required for a suspension')
      .max(500),
    expires_at: z.iso.datetime().optional(),
  })
  .strict();

export const PermissionDescriptorSchema = z.object({
  key: z.enum(PermissionKey),
  module: z.string(),
  label: z.string(),
  description: z.string(),
  sensitive: z.boolean(),
});

export const AccessCatalogResponseSchema = z.object({
  permissions: z.array(PermissionDescriptorSchema),
  modules: z.array(z.string()),
  roles: z.array(
    z.object({
      role_type: z.enum(RoleType),
      permissions: z.array(z.enum(PermissionKey)),
    }),
  ),
});

export const RolePermissionsResponseSchema = z.object({
  role_type: z.enum(RoleType),
  permissions: z.array(z.enum(PermissionKey)),
});

export const AccessUserSchema = z.object({
  user_id: z.string(),
  firstname: z.string(),
  lastname: z.string(),
  email: z.string(),
  role_type: z.enum(RoleType),
  department: z.string().nullable(),
  is_restricted: z.boolean(),
  /** The root operator account — its actions cannot be suspended. */
  is_protected: z.boolean(),
  /** Rights in force right now: baseline + grants − revokes − active suspensions. */
  effective_permissions: z.array(z.enum(PermissionKey)),
  granted_count: z.number(),
  revoked_count: z.number(),
  suspended_count: z.number(),
  /** Set when at least one suspension is in force, for the row badge. */
  latest_suspension_reason: z.string().nullable(),
});

export const AccessUserListResponseSchema = z.object({
  items: z.array(AccessUserSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
});

export const ActionSuspensionSchema = z.object({
  suspension_id: z.string(),
  permission: z.enum(PermissionKey),
  reason: z.string(),
  issued_by_user_id: z.string(),
  issued_at: z.iso.datetime(),
  expires_at: z.iso.datetime().nullable(),
  lifted_at: z.iso.datetime().nullable(),
  /** False once lifted or expired — the portal shows history as well as what's live. */
  active: z.boolean(),
});

export const AccessUserDetailSchema = AccessUserSchema.extend({
  /** The role baseline this user inherits, before any per-user change. */
  role_permissions: z.array(z.enum(PermissionKey)),
  overrides: z.array(
    z.object({
      permission: z.enum(PermissionKey),
      effect: z.enum(PermissionOverrideEffect),
      reason: z.string().nullable(),
      granted_by_user_id: z.string(),
      updated_at: z.iso.datetime(),
    }),
  ),
  suspensions: z.array(ActionSuspensionSchema),
});
