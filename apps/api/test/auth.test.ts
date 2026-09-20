import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { generate } from 'otplib';
import { eq } from 'drizzle-orm';
import { app, PASSWORD, resetAll, makeUser, loginAs, closeOwnerPool, agentFor, testIp, type Agent } from './helpers.js';
import { db, pool } from '../src/db/client.js';
import { users, sessions } from '../src/db/schema/index.js';
import { MAX_FAILED_ATTEMPTS } from '../src/modules/auth/service.js';

beforeEach(resetAll);
afterAll(async () => { await pool.end(); await closeOwnerPool(); });

describe('FR-01 login and session', () => {
  it('authenticates a cashier with the correct password and sets httpOnly cookies', async () => {
    const u = await makeUser('cashier');
    const { res } = await loginAs(u.email);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('authenticated');
    expect(res.body.user.role).toBe('cashier');
    expect(res.body.user.permissions).toContain('incident.report');
    expect(res.body.user.permissions).not.toContain('users.manage');
    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies.some((c) => c.startsWith('ss_access=') && /HttpOnly/i.test(c) && /SameSite=Strict/i.test(c))).toBe(true);
    expect(cookies.some((c) => c.startsWith('ss_refresh=') && /Path=\/api\/auth\/refresh/i.test(c))).toBe(true);
  });

  it('GET /me works with the cookie and fails after logout (session revoked, not just cookie cleared)', async () => {
    const u = await makeUser('stock_staff');
    const { agent, res } = await loginAs(u.email);
    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(u.email);

    // Keep the access cookie, log out, then replay it: the session row is revoked, so the
    // still-unexpired JWT is refused.
    const access = cookieValue(res, 'ss_access');
    expect((await agent.post('/api/auth/logout')).status).toBe(204);
    const replay = await request(app).get('/api/auth/me').set('X-Test-IP', testIp()).set('Cookie', `ss_access=${access}`);
    expect(replay.status).toBe(401);
  });
});

describe('FR-02 identical error and lockout', () => {
  it('returns byte-identical bodies for an unknown email and a wrong password', async () => {
    const u = await makeUser('cashier');
    const unknown = await request(app).post('/api/auth/login').set('X-Test-IP', testIp()).send({ email: 'ghost@marvels.example', password: 'whatever-12345' });
    const wrong = await request(app).post('/api/auth/login').set('X-Test-IP', testIp()).send({ email: u.email, password: 'wrong-password-123' });
    expect(unknown.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(unknown.body).toEqual(wrong.body);
  });

  it(`locks the account after ${MAX_FAILED_ATTEMPTS} failed attempts and rejects the correct password until unlocked`, async () => {
    const u = await makeUser('cashier');
    for (let i = 1; i < MAX_FAILED_ATTEMPTS; i++) {
      const r = await request(app).post('/api/auth/login').set('X-Test-IP', testIp()).send({ email: u.email, password: 'nope-nope-nope' });
      expect(r.status).toBe(401);
    }
    const fifth = await request(app).post('/api/auth/login').set('X-Test-IP', testIp()).send({ email: u.email, password: 'nope-nope-nope' });
    expect(fifth.status).toBe(423);
    expect(fifth.body.error.code).toBe('account_locked');

    const correct = await request(app).post('/api/auth/login').set('X-Test-IP', testIp()).send({ email: u.email, password: PASSWORD });
    expect(correct.status).toBe(423);

    const [row] = await db.select().from(users).where(eq(users.id, u.id));
    expect(row!.lockedAt).not.toBeNull();
    expect(row!.failedAttempts).toBe(MAX_FAILED_ATTEMPTS);

    // Security Admin unlocks (FR-05 / plan A3), then the correct password works again.
    const admin = await makeUser('security_admin');
    const { agent } = await loginAs(admin.email);
    // security_admin needs 2FA; complete enrolment to get a session
    await completeEnrolment(agent);
    const unlock = await agent.post(`/api/users/${u.id}/unlock`);
    expect(unlock.status).toBe(200);
    expect(unlock.body.user.lockedAt).toBeNull();

    const again = await request(app).post('/api/auth/login').set('X-Test-IP', testIp()).send({ email: u.email, password: PASSWORD });
    expect(again.status).toBe(200);
  });

  it('resets the failed counter on a successful login', async () => {
    const u = await makeUser('cashier');
    await request(app).post('/api/auth/login').set('X-Test-IP', testIp()).send({ email: u.email, password: 'bad-bad-bad-bad' });
    await request(app).post('/api/auth/login').set('X-Test-IP', testIp()).send({ email: u.email, password: 'bad-bad-bad-bad' });
    await loginAs(u.email);
    const [row] = await db.select().from(users).where(eq(users.id, u.id));
    expect(row!.failedAttempts).toBe(0);
  });
});

describe('NFR-04 rate limiting', () => {
  it('returns 429 on the 11th login attempt from one address within a minute', async () => {
    const u = await makeUser('cashier', { email: 'ratelimit@marvels.example' });
    let last: request.Response | undefined;
    for (let i = 0; i < 10; i++) {
      last = await request(app).post('/api/auth/login').set('X-Test-IP', '203.0.113.77').send({ email: u.email, password: PASSWORD });
    }
    expect(last!.status).toBe(200);
    const eleventh = await request(app).post('/api/auth/login').set('X-Test-IP', '203.0.113.77').send({ email: u.email, password: PASSWORD });
    expect(eleventh.status).toBe(429);
    expect(eleventh.body.error.code).toBe('rate_limited');
  });
});

describe('FR-03 second factor for Owner and Security Admin', () => {
  it('does not issue a session on password alone, forces enrolment, then verifies a TOTP code', async () => {
    const owner = await makeUser('owner');
    const { agent, res } = await loginAs(owner.email);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('totp_enrolment_required');
    expect((await agent.get('/api/auth/me')).status).toBe(401);

    const manualKey = await completeEnrolment(agent);
    expect((await agent.get('/api/auth/me')).status).toBe(200);

    // Next login: password, then a real code from the same secret.
    const second = agentFor();
    const r1 = await second.post('/api/auth/login').send({ email: owner.email, password: PASSWORD });
    expect(r1.body.status).toBe('totp_required');
    const bad = await second.post('/api/auth/totp/verify').send({ code: '000000' });
    expect(bad.status).toBe(401);
    const good = await second.post('/api/auth/totp/verify').send({ code: await generate({ secret: manualKey }) });
    expect(good.status).toBe(200);
    expect(good.body.user.totpEnabled).toBe(true);
    expect((await second.get('/api/auth/me')).status).toBe(200);
  });

  it('a Security Admin can reset another user\'s 2FA, which forces re-enrolment', async () => {
    const owner = await makeUser('owner');
    const { agent: ownerAgent } = await loginAs(owner.email);
    await completeEnrolment(ownerAgent);

    const sa = await makeUser('security_admin');
    const { agent: saAgent } = await loginAs(sa.email);
    await completeEnrolment(saAgent);

    const reset = await saAgent.post(`/api/users/${owner.id}/reset-2fa`);
    expect(reset.status).toBe(200);
    expect(reset.body.user.totpEnabled).toBe(false);
    // Owner's existing session died with the reset.
    expect((await ownerAgent.get('/api/auth/me')).status).toBe(401);
    const again = await request(app).post('/api/auth/login').set('X-Test-IP', testIp()).send({ email: owner.email, password: PASSWORD });
    expect(again.body.status).toBe('totp_enrolment_required');
  });
});

describe('NFR-02 refresh rotation and FR-05 revocation', () => {
  it('rotates the refresh token and rejects a replayed old one, killing the session', async () => {
    const u = await makeUser('manager');
    const { agent, res } = await loginAs(u.email);
    const oldRefresh = cookieValue(res, 'ss_refresh');

    const r1 = await agent.post('/api/auth/refresh');
    expect(r1.status).toBe(200);
    const newRefresh = cookieValue(r1, 'ss_refresh');
    expect(newRefresh).not.toBe(oldRefresh);

    const replay = await request(app).post('/api/auth/refresh').set('X-Test-IP', testIp()).set('Cookie', `ss_refresh=${oldRefresh}`);
    expect(replay.status).toBe(401);
    // Replay detection revoked the session, so even the new token is dead now.
    const afterReplay = await request(app).post('/api/auth/refresh').set('X-Test-IP', testIp()).set('Cookie', `ss_refresh=${newRefresh}`);
    expect(afterReplay.status).toBe(401);
  });

  it('suspending an account revokes its live sessions immediately', async () => {
    const victim = await makeUser('cashier');
    const { agent: victimAgent } = await loginAs(victim.email);
    expect((await victimAgent.get('/api/auth/me')).status).toBe(200);

    const sa = await makeUser('security_admin');
    const { agent: saAgent } = await loginAs(sa.email);
    await completeEnrolment(saAgent);
    const r = await saAgent.patch(`/api/users/${victim.id}/status`).send({ status: 'suspended', reason: 'test' });
    expect(r.status).toBe(200);
    expect(r.body.user.status).toBe('suspended');

    expect((await victimAgent.get('/api/auth/me')).status).toBe(401);
    const live = await db.select().from(sessions).where(eq(sessions.userId, victim.id));
    expect(live.every((s) => s.revokedAt !== null)).toBe(true);

    const relogin = await request(app).post('/api/auth/login').set('X-Test-IP', testIp()).send({ email: victim.email, password: PASSWORD });
    expect(relogin.status).toBe(401);
  });
});

describe('FR-04 deny by default', () => {
  it('a cashier gets 403 on /api/users, and 401 without a session', async () => {
    const u = await makeUser('cashier');
    const { agent } = await loginAs(u.email);
    expect((await agent.get('/api/users')).status).toBe(403);
    expect((await request(app).get('/api/users').set('X-Test-IP', testIp())).status).toBe(401);
  });

  it('a Security Admin can list users and sees masked NIC and phone in the list', async () => {
    const sa = await makeUser('security_admin');
    const { agent } = await loginAs(sa.email);
    await completeEnrolment(agent);
    const r = await agent.get('/api/users');
    expect(r.status).toBe(200);
    const me = r.body.users.find((x: { id: number }) => x.id === sa.id);
    expect(me.nic).toBe('•••• 5678');
    const one = await agent.get(`/api/users/${sa.id}`);
    expect(one.body.user.nic).toBe('199912345678');
  });
});

// Helpers ------------------------------------------------------------------------------

async function completeEnrolment(agent: Agent) {
  const enrol = await agent.post('/api/auth/totp/enrol');
  expect(enrol.status).toBe(200);
  expect(enrol.body.qrDataUrl).toMatch(/^data:image\/png;base64,/);
  const manualKey: string = enrol.body.manualKey;
  const confirm = await agent.post('/api/auth/totp/confirm').send({ code: await generate({ secret: manualKey }) });
  expect(confirm.status).toBe(200);
  expect(confirm.body.status).toBe('authenticated');
  return manualKey;
}

function cookieValue(res: request.Response, name: string) {
  const raw = (res.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith(`${name}=`));
  return raw?.split(';')[0]?.slice(name.length + 1);
}
