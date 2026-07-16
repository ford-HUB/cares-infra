import "dotenv/config";
import { getDatabaseUrl } from "./database-url.mjs";
import { PrismaClient } from "../dist/infastructures/prisma/common/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const adapter = new PrismaPg({ connectionString: getDatabaseUrl() });
const prisma = new PrismaClient({ adapter });

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error("Usage: node scripts/debug-login.mjs <email> <password>");
  process.exit(1);
}

try {
  const account = await prisma.account.findUnique({
    where: { email },
    select: {
      email: true,
      password: true,
      user: {
        select: {
          user_id: true,
          role: { select: { type: true } },
          user_interest: { select: { user_interest_id: true } },
        },
      },
    },
  });

  console.log("account found:", !!account);
  if (!account) process.exit(0);

  console.log("password prefix:", account.password?.slice(0, 7));

  const passwordMatches = await bcrypt.compare(password, account.password);
  console.log("password matches:", passwordMatches);

  const token = jwt.sign(
    {
      sub: account.user.user_id,
      email: account.email,
      role_type: account.user.role.type,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN ?? "7d" },
  );
  console.log("token issued:", token.slice(0, 20) + "...");
} catch (error) {
  console.error("ERROR:", error);
} finally {
  await prisma.$disconnect();
}
