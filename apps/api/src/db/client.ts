import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema/index.js';
import { env, isTest } from '../config/env.js';

// The API always connects as the low-privilege app role. Migrations use a separate client
// (scripts/migrate.ts) as the owner role. Under NODE_ENV=test the test database is used so
// the suite can wipe it freely.
const connectionString = isTest ? (env.TEST_DATABASE_URL ?? env.DATABASE_URL) : env.DATABASE_URL;

export const pool = new pg.Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30_000,
});

export const db = drizzle(pool, { schema, casing: 'snake_case' });

export type Db = typeof db;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
