import "dotenv/config";
import { defineConfig } from "prisma/config";
import { getDatabaseUrl } from "./src/common/utils/database-url";

export default defineConfig({
  schema: "./src/infastructures/prisma/schema.prisma",
  migrations: {
    path: "./src/infastructures/prisma/migrations",
  },
  datasource: {
    url: getDatabaseUrl(),
  },
});
