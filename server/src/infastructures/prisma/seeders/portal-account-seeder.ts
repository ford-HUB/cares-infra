import { z } from 'zod';
import * as bcrypt from 'bcrypt';
import { PrismaClient, RoleType } from '../common/client';

const PORTAL_ROLES = [
  RoleType.ADMIN,
  RoleType.DIRECTOR,
  RoleType.COORDINATOR,
] as const;

type PortalRole = (typeof PORTAL_ROLES)[number];

type PortalSeedOptions = {
  /** Env var prefix, e.g. `SEED_ADMIN` reads SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, ... */
  envPrefix: string;
  defaultFirstname: string;
  defaultLastname: string;
  defaultRole: PortalRole;
};

const buildSchema = (options: PortalSeedOptions) =>
  z.object({
    email: z.string().trim().email(),
    password: z
      .string()
      .min(8, `${options.envPrefix}_PASSWORD must be at least 8 characters`),
    firstname: z.string().trim().min(1).default(options.defaultFirstname),
    lastname: z.string().trim().min(1).default(options.defaultLastname),
    phone: z.string().trim().min(7).max(25).optional(),
    address: z.string().trim().min(1).default('University of Cebu – LM'),
    role: z.enum(PORTAL_ROLES).default(options.defaultRole),
  });

type PortalSeedEnv = z.infer<ReturnType<typeof buildSchema>>;

const readSeedEnv = (options: PortalSeedOptions): PortalSeedEnv => {
  const prefix = options.envPrefix;
  const parsed = buildSchema(options).safeParse({
    email: process.env[`${prefix}_EMAIL`],
    password: process.env[`${prefix}_PASSWORD`],
    firstname: process.env[`${prefix}_FIRSTNAME`],
    lastname: process.env[`${prefix}_LASTNAME`],
    phone: process.env[`${prefix}_PHONE`],
    address: process.env[`${prefix}_ADDRESS`],
    role: process.env[`${prefix}_ROLE`],
  });

  if (!parsed.success) {
    const detail = parsed.error.issues
      .map(
        (issue) =>
          `  - ${prefix}_${issue.path.join('.').toUpperCase()}: ${issue.message}`,
      )
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

const findOrCreateRole = async (prisma: PrismaClient, type: RoleType) => {
  const existing = await prisma.role.findFirst({
    where: { type },
    select: { role_id: true },
  });

  return (
    existing ??
    (await prisma.role.create({
      data: { type },
      select: { role_id: true },
    }))
  );
};

/** Creates a portal account, or resets its password and role if the email already exists. */
export const seedPortalAccount = async (
  prisma: PrismaClient,
  options: PortalSeedOptions,
): Promise<void> => {
  const env = readSeedEnv(options);
  const email = env.email.toLowerCase();
  const role = await findOrCreateRole(prisma, env.role);
  const passwordHash = await bcrypt.hash(env.password, 10);

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

    console.log(`Updated ${env.role} account: ${email}`);
    return;
  }

  await prisma.user.create({
    data: {
      firstname: env.firstname,
      lastname: env.lastname,
      age: 30,
      current_address: env.address,
      phone_number: resolvePhone(email, env.phone),
      role_id: role.role_id,
      accounts: {
        create: {
          email,
          password: passwordHash,
        },
      },
    },
  });

  console.log(`Created ${env.role} account: ${email}`);
};
