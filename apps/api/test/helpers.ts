import request from 'supertest';
import pg from 'pg';
import type { Role } from '@secureshelf/shared';
import { createApp } from '../src/app.js';
import { db } from '../src/db/client.js';
import { users } from '../src/db/schema/index.js';
import { hashPassword, encryptField } from '../src/lib/crypto.js';

export const app = createApp();
export const PASSWORD = 'Test-Password-12345';

// Wipes application data between tests as the OWNER role: the runtime role has no TRUNCATE
// privilege (least privilege, see migration 0001). audit_events is left alone; the chain
// stays valid because rows are only ever appended.
const ownerPool = new pg.Pool({ connectionString: process.env.TEST_MIGRATOR_DATABASE_URL, max: 1 });
export async function resetData() {
  await ownerPool.query(`
    TRUNCATE TABLE
      sessions, policy_acknowledgements, policy_version_roles, policy_versions, policies,
      quiz_attempts, course_progress, course_roles, quiz_questions, lessons, courses,
      evidence_files, control_assessments, controls, assets,
      monitoring_notice_acks, monitoring_notices, cctv_access_declarations, camera_authorisations, cameras,
      incident_status_history, incidents, users
    RESTART IDENTITY CASCADE
  `);
}
export const closeOwnerPool = () => ownerPool.end();

// Each test gets its own rate-limit bucket (see sourceIp in middleware/rateLimit.ts), so
// the 10-per-minute login limit never bleeds between tests. Call `testIp()` for the current
// test's address when sending requests without the agent helper.
let currentTestIp = '10.0.0.1';
export const testIp = () => currentTestIp;
export function newTestIp() {
  currentTestIp = `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 254) + 1}`;
  return currentTestIp;
}

// Agent that carries cookies and this test's X-Test-IP on every request.
export function agentFor(ip = currentTestIp) {
  const agent = request.agent(app);
  const withIp = <T extends { set: (k: string, v: string) => T }>(r: T) => r.set('X-Test-IP', ip);
  return {
    get: (url: string) => withIp(agent.get(url)),
    post: (url: string) => withIp(agent.post(url)),
    patch: (url: string) => withIp(agent.patch(url)),
    put: (url: string) => withIp(agent.put(url)),
    delete: (url: string) => withIp(agent.delete(url)),
  };
}
export type Agent = ReturnType<typeof agentFor>;

let passwordHashCache: string | undefined;

export async function makeUser(role: Role, overrides: Partial<{ email: string; fullName: string; status: 'active' | 'suspended' | 'offboarded' }> = {}) {
  passwordHashCache ??= await hashPassword(PASSWORD);
  const email = overrides.email ?? `${role}.${Math.random().toString(36).slice(2, 8)}@marvels.example`;
  const [row] = await db
    .insert(users)
    .values({
      email,
      fullName: overrides.fullName ?? `Test ${role}`,
      role,
      status: overrides.status ?? 'active',
      passwordHash: passwordHashCache,
      nicEnc: encryptField('199912345678'),
      phoneEnc: encryptField('0770000000'),
    })
    .returning();
  return row!;
}

// Logs in and returns an agent that carries the session cookies.
export async function loginAs(email: string, password = PASSWORD) {
  const agent = agentFor();
  const res = await agent.post('/api/auth/login').send({ email, password });
  return { agent, res };
}

export async function resetAll() {
  newTestIp();
  await resetData();
}
