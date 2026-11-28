import { SetMetadata } from '@nestjs/common';
import { PermissionKey } from '../../infastructures/prisma/common/client';

export const PERMISSIONS_KEY = 'permissions';

/** Checked by `PermissionsGuard` against effective rights; method-level replaces class-level. */
export const RequirePermission = (...permissions: PermissionKey[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
