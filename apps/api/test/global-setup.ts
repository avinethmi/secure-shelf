// Runs once before the suite: loads .env, then drops and re-migrates the TEST database as
// the migrator role. Never touches the development database.
import pg from 'pg';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

export default async function globalSetup() {
  process.loadEnvFile(fileURLToPath(new URL('../../../.env', import.meta.url)));
  const url = process.env.TEST_MIGRATOR_DATABASE_URL;
  if (!url) throw new Error('TEST_MIGRATOR_DATABASE_URL is not set in .env');
  if (!/test/i.test(new URL(url).pathname)) throw new Error('Refusing to reset a database whose name does not contain "test"');

  const client = new pg.Client({ connectionString: url });
  await client.connect();
  await client.query('DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;');
  await client.end();

  const pool = new pg.Pool({ connectionString: url, max: 1 });
  await migrate(drizzle(pool), { migrationsFolder: fileURLToPath(new URL('../src/db/migrations', import.meta.url)) });
  await pool.end();
}
