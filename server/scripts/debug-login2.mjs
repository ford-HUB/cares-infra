import "dotenv/config";
import { getDatabaseUrl } from "./database-url.mjs";
import { PrismaClient } from "../dist/infastructures/prisma/common/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const email = process.argv[2];
const password = process.argv[3];

const adapter = new PrismaPg({ connectionString: getDatabaseUrl() });
const prisma = new PrismaClient({ adapter });

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

console.log("found", !!account);
const passwordMatches = await bcrypt.compare(password, account.password);
console.log("matches", passwordMatches);

const payload = {
  sub: account.user.user_id,
  email: account.email,
  role_type: account.user.role.type,
};
console.log("payload", payload);

try {
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  });
  console.log("token ok", token.slice(0, 30));
} catch (e) {
  console.error("jwt sign failed", e);
}

const result = {
  user_id: account.user.user_id,
  role_type: account.user.role.type,
  email: account.email,
  has_interests: account.user.user_interest !== null,
};
console.log("result", result);

await prisma.$disconnect();
