import "dotenv/config";
import { PrismaClient } from "../dist/infastructures/prisma/common/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";
import { z } from "zod";

const DIRECTOR_ROLE = "DIRECTOR";

const seedEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SEED_ADMIN_EMAIL: z.string().trim().email(),
  SEED_ADMIN_PASSWORD: z.string().min(8, "SEED_ADMIN_PASSWORD must be at least 8 characters"),
  SEED_ADMIN_FIRSTNAME: z.string().trim().min(1).default("CARES"),
  SEED_ADMIN_LASTNAME: z.string().trim().min(1).default("Director"),
  SEED_ADMIN_PHONE: z.string().trim().min(7).max(25).optional(),
  SEED_ADMIN_ADDRESS: z.string().trim().min(1).default("University of Cebu – LM"),
});

function readSeedEnv() {
  return {
    DATABASE_URL: process.env.DATABASE_URL,
    SEED_ADMIN_EMAIL: process.env.SEED_ADMIN_EMAIL,
    SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD,
    SEED_ADMIN_FIRSTNAME: process.env.SEED_ADMIN_FIRSTNAME,
    SEED_ADMIN_LASTNAME: process.env.SEED_ADMIN_LASTNAME,
    SEED_ADMIN_PHONE: process.env.SEED_ADMIN_PHONE,
    SEED_ADMIN_ADDRESS: process.env.SEED_ADMIN_ADDRESS,
  };
}

function resolvePhone(email, explicitPhone) {
  if (explicitPhone) {
    return explicitPhone;
  }
  const slug = email.replace(/[^a-z0-9]/gi, "").slice(0, 12);
  return `seed-${slug || "admin"}`.slice(0, 25);
}

async function findOrCreateDirectorRole(prisma) {
  const existing = await prisma.role.findFirst({
    where: { type: DIRECTOR_ROLE },
    select: { role_id: true },
  });

  if (existing) {
    return existing;
  }

  return prisma.role.create({
    data: { type: DIRECTOR_ROLE },
    select: { role_id: true },
  });
}

const parsed = seedEnvSchema.safeParse(readSeedEnv());
if (!parsed.success) {
  console.error("Invalid seed environment:");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

const env = parsed.data;
const email = env.SEED_ADMIN_EMAIL.toLowerCase();
const phoneNumber = resolvePhone(email, env.SEED_ADMIN_PHONE);

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

try {
  const role = await findOrCreateDirectorRole(prisma);
  const passwordHash = await bcrypt.hash(env.SEED_ADMIN_PASSWORD, 10);

  const existingAccount = await prisma.account.findUnique({
    where: { email },
    select: {
      account_id: true,
      user_id: true,
    },
  });

  if (existingAccount) {
    await prisma.$transaction([
      prisma.account.update({
        where: { email },
        data: { password: passwordHash },
      }),
      prisma.user.update({
        where: { user_id: existingAccount.user_id },
        data: { role_id: role.role_id },
      }),
    ]);

    console.log(`Updated director account: ${email}`);
  } else {
    await prisma.user.create({
      data: {
        firstname: env.SEED_ADMIN_FIRSTNAME,
        lastname: env.SEED_ADMIN_LASTNAME,
        age: 30,
        current_address: env.SEED_ADMIN_ADDRESS,
        phone_number: '09123456789',
        role_id: role.role_id,
        accounts: {
          create: {
            email,
            password: passwordHash,
          },
        },
      },
    });

    console.log(`Created director account: ${email}`);
  }
} catch (error) {
  console.error("Director seed failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
