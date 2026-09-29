import { SetMetadata } from '@nestjs/common';
import { PermissionKey } from '../../infastructures/prisma/common/client';

export const PERMISSIONS_KEY = 'permissions';

/**
 * The rights a route needs on top of `@Roles`. Checked by `PermissionsGuard` against
 * the caller's effective rights — role baseline + grants − revokes − suspensions —
 * so what an admin ticks in Access Control is what the API honours. A method-level
 * decorator replaces the class-level one, the same way `@Roles` narrows.
 */
export const RequirePermission = (...permissions: PermissionKey[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
