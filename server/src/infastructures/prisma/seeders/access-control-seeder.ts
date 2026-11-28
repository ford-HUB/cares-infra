import { PrismaClient, RoleType } from '../common/client';
import {
  DEFAULT_ROLE_PERMISSIONS,
  defaultPermissionsFor,
} from '../../../shared/constants/permission-catalog';

/** Additive: inserts only missing permissions, keeping admin edits. */
export const seedAccessControl = async (
  prisma: PrismaClient,
): Promise<void> => {
  const roles = Object.keys(DEFAULT_ROLE_PERMISSIONS) as RoleType[];

  for (const role of roles) {
    const permissions = defaultPermissionsFor(role);

    const result = await prisma.rolePermissionDefault.createMany({
      data: permissions.map((permission) => ({
        role_type: role,
        permission,
      })),
      skipDuplicates: true,
    });

    console.log(
      `Seeded ${role} baseline: ${result.count} added, ${permissions.length - result.count} already present`,
    );
  }
};
