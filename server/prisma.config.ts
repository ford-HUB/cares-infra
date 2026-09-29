import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: './src/infastructures/prisma/schema.prisma',
  migrations: {
    path: './src/infastructures/prisma/migrations',
    seed: 'pnpm run seed admin',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
