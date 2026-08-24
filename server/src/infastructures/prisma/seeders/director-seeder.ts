import { PrismaClient, RoleType } from '../common/client';
import { seedPortalAccount } from './portal-account-seeder';

/** Creates the portal director, or resets its password and role if the email already exists. */
export const seedDirector = async (prisma: PrismaClient): Promise<void> =>
  seedPortalAccount(prisma, {
    envPrefix: 'SEED_DIRECTOR',
    defaultFirstname: 'CARES',
    defaultLastname: 'Director',
    defaultRole: RoleType.DIRECTOR,
  });
