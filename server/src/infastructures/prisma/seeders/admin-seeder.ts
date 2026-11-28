import { PrismaClient, RoleType } from '../common/client';
import { seedPortalAccount } from './portal-account-seeder';

/** Creates the first admin, or resets its password and role. */
export const seedAdmin = async (prisma: PrismaClient): Promise<void> =>
  seedPortalAccount(prisma, {
    envPrefix: 'SEED_ADMIN',
    defaultFirstname: 'CARES',
    defaultLastname: 'Admin',
    defaultRole: RoleType.ADMIN,
  });
