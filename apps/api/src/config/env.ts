import { z } from 'zod';

// Every environment variable the API depends on is validated once at startup.
// A missing or malformed value fails fast with a readable message instead of a
// runtime surprise halfway through a request.

const base64Key32 = z
  .string()
  .refine((v) => {
    try {
      return Buffer.from(v, 'base64').length === 32;
    } catch {
      return false;
    }
  }, 'must be exactly 32 bytes, base64 encoded');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGINS: z
    .string()
    .default('')
    .transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean)),

  DATABASE_URL: z.string().url(),
  MIGRATOR_DATABASE_URL: z.string().url(),
  TEST_DATABASE_URL: z.string().url().optional(),
  TEST_MIGRATOR_DATABASE_URL: z.string().url().optional(),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  FIELD_ENCRYPTION_KEY: base64Key32,

  STORAGE_DIR: z.string().default('./storage'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid environment configuration:\n${issues}\nSee .env.example at the repo root.`);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
