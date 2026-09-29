import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './common/client';
import { seedAccessControl } from './seeders/access-control-seeder';
import { seedAdmin } from './seeders/admin-seeder';
import { seedAttendance } from './seeders/attendance-seeder';
import { seedDirector } from './seeders/director-seeder';
import { seedEvents } from './seeders/events-seeder';
import { seedMonthlyReports } from './seeders/monthly-reports-seeder';

const SEEDERS = {
  admin: seedAdmin,
  director: seedDirector,
  events: seedEvents,
  attendance: seedAttendance,
  'access-control': seedAccessControl,
  'monthly-reports': seedMonthlyReports,
} as const;

type SeederName = keyof typeof SEEDERS;

const isSeederName = (value: string): value is SeederName => value in SEEDERS;

/** `node dist/infastructures/prisma/seed.js [name ...]` — no argument runs the admin seeder. */
const resolveRequested = (args: string[]): SeederName[] => {
  if (args.length === 0) {
    return ['admin'];
  }

  const unknown = args.filter((arg) => !isSeederName(arg));
  if (unknown.length > 0) {
    throw new Error(
      `Unknown seeder(s): ${unknown.join(', ')}. Available: ${Object.keys(SEEDERS).join(', ')}`,
    );
  }

  return args.filter(isSeederName);
};

const main = async (): Promise<void> => {
  const requested = resolveRequested(process.argv.slice(2));

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    for (const name of requested) {
      await SEEDERS[name](prisma);
    }
  } finally {
    await prisma.$disconnect();
  }
};

main().catch((error: unknown) => {
  console.error('Seed failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
