import "dotenv/config";
import { PrismaClient } from "../dist/infastructures/prisma/common/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";

const email = "dyfordbonghanoy@gmail.com";
const password = "TestLogin123!";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const hash = await bcrypt.hash(password, 10);
await prisma.account.update({
  where: { email },
  data: { password: hash },
});

console.log("updated password for", email, "to", password);

const loginRes = await fetch("http://192.168.1.24:8000/api/v1/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
console.log("login", loginRes.status, await loginRes.text());

await prisma.$disconnect();
