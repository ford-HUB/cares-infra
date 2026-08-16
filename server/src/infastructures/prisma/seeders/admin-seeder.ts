import { z } from 'zod';
import * as bcrypt from 'bcrypt';
import { PrismaClient, RoleType } from '../common/client';

const SeedAdminEnvSchema = z.object({
  SEED_ADMIN_EMAIL: z.string().trim().email(),
  SEED_ADMIN_PASSWORD: z
    .string()
    .min(8, 'SEED_ADMIN_PASSWORD must be at least 8 characters'),
  SEED_ADMIN_FIRSTNAME: z.string().trim().min(1).default('CARES'),
  SEED_ADMIN_LASTNAME: z.string().trim().min(1).default('Director'),
  SEED_ADMIN_PHONE: z.string().trim().min(7).max(25).optional(),
  SEED_ADMIN_ADDRESS: z
    .string()
    .trim()
    .min(1)
    .default('University of Cebu – LM'),
});

type SeedAdminEnv = z.infer<typeof SeedAdminEnvSchema>;

const readSeedEnv = (): SeedAdminEnv => {
  const parsed = SeedAdminEnvSchema.safeParse({
    SEED_ADMIN_EMAIL: process.env.SEED_ADMIN_EMAIL,
    SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD,
    SEED_ADMIN_FIRSTNAME: process.env.SEED_ADMIN_FIRSTNAME,
    SEED_ADMIN_LASTNAME: process.env.SEED_ADMIN_LASTNAME,
    SEED_ADMIN_PHONE: process.env.SEED_ADMIN_PHONE,
    SEED_ADMIN_ADDRESS: process.env.SEED_ADMIN_ADDRESS,
  });

  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid seed environment:\n${detail}`);
  }

  return parsed.data;
};

const resolvePhone = (email: string, explicitPhone?: string): string => {
  if (explicitPhone) {
    return explicitPhone;
  }

  const slug = email.replace(/[^a-z0-9]/gi, '').slice(0, 12);
  return `seed-${slug || 'admin'}`.slice(0, 25);
};

const findOrCreateDirectorRole = async (prisma: PrismaClient) => {
  const existing = await prisma.role.findFirst({
    where: { type: RoleType.DIRECTOR },
    select: { role_id: true },
  });

  return (
    existing ??
    (await prisma.role.create({
      data: { type: RoleType.DIRECTOR },
      select: { role_id: true },
    }))
  );
};

/** Creates the first director account, or resets its password and role if the email already exists. */
export const seedAdmin = async (prisma: PrismaClient): Promise<void> => {
  const env = readSeedEnv();
  const email = env.SEED_ADMIN_EMAIL.toLowerCase();
  const role = await findOrCreateDirectorRole(prisma);
  const passwordHash = await bcrypt.hash(env.SEED_ADMIN_PASSWORD, 10);

  const existingAccount = await prisma.account.findUnique({
    where: { email },
    select: { account_id: true, user_id: true },
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
    return;
  }

  await prisma.user.create({
    data: {
      firstname: env.SEED_ADMIN_FIRSTNAME,
      lastname: env.SEED_ADMIN_LASTNAME,
      age: 30,
      current_address: env.SEED_ADMIN_ADDRESS,
      phone_number: resolvePhone(email, env.SEED_ADMIN_PHONE),
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
};
