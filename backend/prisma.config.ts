import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // The CLI only needs a URL for migrate/introspect; `prisma generate` works without it.
    url: process.env['DATABASE_URL'] ?? '',
  },
});
