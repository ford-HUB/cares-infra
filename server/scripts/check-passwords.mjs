import "dotenv/config";
import { getDatabaseUrl } from "./database-url.mjs";
import { PrismaClient } from "../dist/infastructures/prisma/common/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: getDatabaseUrl() });
const prisma = new PrismaClient({ adapter });

const accounts = await prisma.account.findMany({
  select: { email: true, password: true },
});

for (const account of accounts) {
  const isBcrypt = account.password?.startsWith("$2");
  console.log(account.email, isBcrypt ? "bcrypt" : "PLAIN/INVALID", account.password?.slice(0, 20));
}

await prisma.$disconnect();
