import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "./src/infastructures/prisma/schema.prisma",
  migrations: {
    path: "./src/infastructures/prisma/migrations",
  },
  datasource: {
    url: process.env["EXTERNAL_CLOUD_DATABASE_URL"],
  },
});
