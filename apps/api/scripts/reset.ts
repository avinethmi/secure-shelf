// Drops everything and re-applies migrations, then seeds. Development and demo use only.
// Usage: npm run db:reset   (NODE_ENV=test targets the test database and skips seeding)
import pg from 'pg';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const isTest = process.env.NODE_ENV === 'test';
const url = isTest ? process.env.TEST_MIGRATOR_DATABASE_URL : process.env.MIGRATOR_DATABASE_URL;
if (!url) throw new Error(`${isTest ? 'TEST_' : ''}MIGRATOR_DATABASE_URL is not set`);
if (process.env.NODE_ENV === 'production') throw new Error('Refusing to reset a production database');

const client = new pg.Client({ connectionString: url });
await client.connect();
console.log(`Resetting ${new URL(url).pathname.slice(1)} ...`);
await client.query('DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;');
await client.end();

const dir = fileURLToPath(new URL('.', import.meta.url));
const run = (script: string) => {
  const r = spawnSync(process.execPath, [fileURLToPath(new URL('../../../node_modules/tsx/dist/cli.mjs', import.meta.url)), script], {
    cwd: dir,
    stdio: 'inherit',
    env: process.env,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
};
run('migrate.ts');
if (!isTest) run('seed.ts');
