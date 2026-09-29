import { PrismaClient, RoleType } from '../common/client';
import {
  DEFAULT_ROLE_PERMISSIONS,
  defaultPermissionsFor,
} from '../../../shared/constants/permission-catalog';

/**
 * Writes the baseline rights for each portal role. Additive on purpose: a role that
 * an admin has already customised keeps its edits, and only permissions missing from
 * it are inserted — re-running the seeder after a new PermissionKey lands is safe.
 */
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
