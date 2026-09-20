import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { sql } from 'drizzle-orm';
import { generate } from 'otplib';
import { app, resetAll, makeUser, loginAs, closeOwnerPool, agentFor, testIp, type Agent } from './helpers.js';
import { db, pool } from '../src/db/client.js';
import { withTx } from '../src/lib/tx.js';
import { audit, verifyChain, GENESIS_HASH } from '../src/lib/audit.js';

beforeEach(resetAll);
afterAll(async () => { await pool.end(); await closeOwnerPool(); });

describe('FR-19 append-only, hash-chained audit log', () => {
  it('chains each entry to the previous one and verifies clean', async () => {
    const before = await verifyChain();
    expect(before.ok).toBe(true);

    await withTx((tx) => audit(tx, { actor: null, action: 'test.one', entity: 'test', details: { n: 1 } }));
    await withTx((tx) => audit(tx, { actor: null, action: 'test.two', entity: 'test', details: { n: 2 } }));

    const after = await verifyChain();
    expect(after.ok).toBe(true);
    expect(after.checked).toBe(before.checked + 2);

    const rows = await db.execute(sql`select id, prev_hash, hash from audit_events order by id desc limit 2`);
    const [newest, previous] = rows.rows as { id: number; prev_hash: string; hash: string }[];
    expect(newest!.prev_hash).toBe(previous!.hash);
    if (before.checked === 0) expect(previous!.prev_hash).toBe(GENESIS_HASH);
  });

  it('the runtime role cannot UPDATE or DELETE audit rows (grant revoked at the database)', async () => {
    await withTx((tx) => audit(tx, { actor: null, action: 'test.locked', entity: 'test' }));
    const rootMessage = (e: unknown) => {
      let cur = e as { message?: string; cause?: unknown } | undefined;
      while (cur?.cause) cur = cur.cause as typeof cur;
      return cur?.message ?? String(e);
    };
    await expect(db.execute(sql`update audit_events set action = 'tampered' where action = 'test.locked'`).catch((e) => Promise.reject(new Error(rootMessage(e))))).rejects.toThrow(/permission denied/i);
    await expect(db.execute(sql`delete from audit_events where action = 'test.locked'`).catch((e) => Promise.reject(new Error(rootMessage(e))))).rejects.toThrow(/permission denied/i);
  });

  it('concurrent appends never fork the chain (advisory lock)', async () => {
    await Promise.all(Array.from({ length: 12 }, (_, i) => withTx((tx) => audit(tx, { actor: null, action: 'test.concurrent', entity: 'test', details: { i } }))));
    const result = await verifyChain();
    expect(result.ok).toBe(true);
  });

  it('GET /api/audit and /verify are readable by Owner and denied to a cashier', async () => {
    const cashier = await makeUser('cashier');
    const { agent: c } = await loginAs(cashier.email);
    expect((await c.get('/api/audit')).status).toBe(403);
    expect((await c.get('/api/audit/verify')).status).toBe(403);

    const owner = await makeUser('owner');
    const { agent: o } = await loginAs(owner.email);
    const enrol = await o.post('/api/auth/totp/enrol');
    await o.post('/api/auth/totp/confirm').send({ code: await generate({ secret: enrol.body.manualKey }) });

    const list = await o.get('/api/audit?action=auth.&limit=5');
    expect(list.status).toBe(200);
    expect(list.body.events.length).toBeGreaterThan(0);
    expect(list.body.events.every((e: { action: string }) => e.action.startsWith('auth.'))).toBe(true);
    const verify = await o.get('/api/audit/verify');
    expect(verify.status).toBe(200);
    expect(verify.body.ok).toBe(true);
  });
});

describe('sanity', () => {
  it('health endpoint responds without auth', async () => {
    const r = await request(app).get('/api/health').set('X-Test-IP', testIp());
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('ok');
  });
});
