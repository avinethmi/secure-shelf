import { defineConfig } from 'drizzle-kit';

// Migrations are generated from src/db/schema and then hand-edited where SQL is needed
// that Drizzle cannot express (triggers, grants). Applied by scripts/migrate.ts as the
// migrator role.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dbCredentials: {
    url: process.env.MIGRATOR_DATABASE_URL ?? 'postgres://secureshelf_migrator:migrator_dev_password@localhost:5432/secureshelf',
  },
  strict: true,
  verbose: true,
});
