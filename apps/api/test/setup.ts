import { fileURLToPath } from 'node:url';

// Per-worker: make .env available before src/config/env.ts is imported by any test.
process.loadEnvFile(fileURLToPath(new URL('../../../.env', import.meta.url)));
process.env.NODE_ENV = 'test';
