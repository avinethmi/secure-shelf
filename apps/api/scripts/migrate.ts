// Applies src/db/migrations as the migrator (owner) role. Usage: npm run db:migrate
// Set NODE_ENV=test to migrate the test database instead.
import pg from 'pg';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

const isTest = process.env.NODE_ENV === 'test';
const url = isTest ? process.env.TEST_MIGRATOR_DATABASE_URL : process.env.MIGRATOR_DATABASE_URL;
if (!url) throw new Error(`${isTest ? 'TEST_' : ''}MIGRATOR_DATABASE_URL is not set`);

const pool = new pg.Pool({ connectionString: url, max: 1 });
const db = drizzle(pool);

console.log(`Migrating ${new URL(url).pathname.slice(1)} as ${new URL(url).username} ...`);
await migrate(db, { migrationsFolder: fileURLToPath(new URL('../src/db/migrations', import.meta.url)) });
console.log('Migrations applied.');
await pool.end();
