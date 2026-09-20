import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { generate } from 'otplib';
import { eq, desc } from 'drizzle-orm';
import { resetAll, makeUser, loginAs, closeOwnerPool, type Agent } from './helpers.js';
import { db, pool } from '../src/db/client.js';
import { auditEvents, policyVersions } from '../src/db/schema/index.js';

beforeEach(resetAll);
afterAll(async () => {
  await pool.end();
  await closeOwnerPool();
});

const CONTENT = '# Acceptable Use\n\nStaff use Marvels systems for Marvels work only. Report anything unusual to the Security Administrator.';

async function adminAgent(role: 'owner' | 'security_admin') {
  const u = await makeUser(role);
  const { agent } = await loginAs(u.email);
  const enrol = await agent.post('/api/auth/totp/enrol');
  await agent.post('/api/auth/totp/confirm').send({ code: await generate({ secret: enrol.body.manualKey }) });
  return { user: u, agent };
}

async function draftPolicy(sa: Agent, overrides: Partial<{ title: string; content: string }> = {}) {
  const r = await sa.post('/api/policies').send({ title: overrides.title ?? 'Acceptable Use Policy', type: 'issue_specific', classification: 'internal', content: overrides.content ?? CONTENT });
  expect(r.status).toBe(201);
  return r.body as { policy: { id: number; code: string }; version: { id: number; versionNo: number; status: string } };
}

describe('FR-06 to FR-09: draft -> review -> approved -> published -> acknowledged', () => {
  it('walks the whole lifecycle with separation of duties and records every step in the audit chain', async () => {
    const { agent: sa } = await adminAgent('security_admin');
    const { agent: owner } = await adminAgent('owner');
    const cashier = await makeUser('cashier');
    const { agent: cashierAgent } = await loginAs(cashier.email);

    const { policy, version } = await draftPolicy(sa);
    expect(policy.code).toBe('POL-001');
    expect(version.status).toBe('draft');

    // Draft is editable, and invisible to staff.
    const edit = await sa.patch(`/api/policies/versions/${version.id}`).send({ content: CONTENT + '\n\nPersonal devices stay off the till network.' });
    expect(edit.status).toBe(200);
    expect((await cashierAgent.get(`/api/policies/versions/${version.id}`)).status).toBe(404);
    expect((await cashierAgent.get('/api/policies/assigned')).body.policies).toEqual([]);

    // Nothing can be published or acknowledged before approval.
    expect((await sa.post(`/api/policies/versions/${version.id}/publish`).send({ roles: ['cashier'] })).status).toBe(409);
    expect((await owner.post(`/api/policies/versions/${version.id}/approve`).send({})).status).toBe(409);

    expect((await sa.post(`/api/policies/versions/${version.id}/submit`)).body.version.status).toBe('review');
    // Once in review, the author can no longer edit it.
    expect((await sa.patch(`/api/policies/versions/${version.id}`).send({ title: 'sneaky edit' })).status).toBe(409);

    // A2: the Security Admin cannot approve; the Owner can.
    expect((await sa.post(`/api/policies/versions/${version.id}/approve`).send({})).status).toBe(403);
    const approved = await owner.post(`/api/policies/versions/${version.id}/approve`).send({ note: 'Looks right' });
    expect(approved.status).toBe(200);
    expect(approved.body.version.status).toBe('approved');
    expect(approved.body.version.approverId).not.toBe(approved.body.version.authorId);

    // Publish to cashiers only.
    expect((await sa.post(`/api/policies/versions/${version.id}/publish`).send({ roles: [] })).status).toBe(400);
    const published = await sa.post(`/api/policies/versions/${version.id}/publish`).send({ roles: ['cashier', 'cashier'] });
    expect(published.status).toBe(200);
    expect(published.body.version.status).toBe('published');
    expect(published.body.version.roles).toEqual(['cashier']);

    // Cashier sees it as pending, a stock assistant does not see it at all.
    const assigned = await cashierAgent.get('/api/policies/assigned');
    expect(assigned.body.policies).toHaveLength(1);
    expect(assigned.body.policies[0].acknowledgedAt).toBeNull();
    const stock = await makeUser('stock_staff');
    const { agent: stockAgent } = await loginAs(stock.email);
    expect((await stockAgent.get('/api/policies/assigned')).body.policies).toEqual([]);
    expect((await stockAgent.post(`/api/policies/versions/${version.id}/acknowledge`)).status).toBe(403);

    // Read then acknowledge; a second click is a no-op that keeps the first timestamp.
    const read = await cashierAgent.get(`/api/policies/versions/${version.id}`);
    expect(read.status).toBe(200);
    expect(read.body.canAcknowledge).toBe(true);
    const ack1 = await cashierAgent.post(`/api/policies/versions/${version.id}/acknowledge`);
    expect(ack1.status).toBe(200);
    expect(ack1.body.alreadyAcknowledged).toBe(false);
    const ack2 = await cashierAgent.post(`/api/policies/versions/${version.id}/acknowledge`);
    expect(ack2.body.alreadyAcknowledged).toBe(true);
    expect(ack2.body.acknowledgedAt).toBe(ack1.body.acknowledgedAt);

    const status = await sa.get(`/api/policies/${policy.id}/acknowledgements`);
    expect(status.body.summary).toEqual({ total: 1, acknowledged: 1 });
    expect(status.body.people[0].userId).toBe(cashier.id);

    const actions = (await db.select({ action: auditEvents.action }).from(auditEvents).orderBy(desc(auditEvents.id)).limit(12)).map((r) => r.action);
    for (const a of ['policy.create', 'policy.version_update', 'policy.submit', 'policy.approve', 'policy.publish', 'policy.acknowledge']) expect(actions).toContain(a);
    // Exactly one acknowledge entry despite two clicks.
    expect(actions.filter((a) => a === 'policy.acknowledge')).toHaveLength(1);
  });

  it('FR-08: the author cannot approve their own version, even as Owner', async () => {
    const { user: ownerUser, agent: owner } = await adminAgent('owner');
    const { agent: sa } = await adminAgent('security_admin');
    const { version } = await draftPolicy(sa);
    await sa.post(`/api/policies/versions/${version.id}/submit`);
    // Make the Owner the author on record (as if they had drafted it themselves).
    await db.update(policyVersions).set({ authorId: ownerUser.id }).where(eq(policyVersions.id, version.id));

    const r = await owner.post(`/api/policies/versions/${version.id}/approve`).send({});
    expect(r.status).toBe(403);
    expect(r.body.error.message).toMatch(/someone else must approve/i);
  });

  it('request changes returns the version to draft with the note, and only staff roles are denied writes', async () => {
    const { agent: sa } = await adminAgent('security_admin');
    const { agent: owner } = await adminAgent('owner');
    const { version } = await draftPolicy(sa);
    await sa.post(`/api/policies/versions/${version.id}/submit`);

    expect((await owner.post(`/api/policies/versions/${version.id}/request-changes`).send({ note: '' })).status).toBe(400);
    const back = await owner.post(`/api/policies/versions/${version.id}/request-changes`).send({ note: 'Add the clean desk rule' });
    expect(back.status).toBe(200);
    expect(back.body.version.status).toBe('draft');
    expect(back.body.version.reviewNote).toBe('Add the clean desk rule');

    const manager = await makeUser('manager');
    const { agent: managerAgent } = await loginAs(manager.email);
    expect((await managerAgent.post('/api/policies').send({ title: 'x', type: 'overall', classification: 'public', content: CONTENT })).status).toBe(403);
    expect((await managerAgent.get('/api/policies')).status).toBe(403);
    expect((await managerAgent.post(`/api/policies/versions/${version.id}/approve`).send({})).status).toBe(403);
  });

  it('FR-07: a published version is immutable in the service and in the database, and a new version supersedes it', async () => {
    const { agent: sa } = await adminAgent('security_admin');
    const { agent: owner } = await adminAgent('owner');
    const cashier = await makeUser('cashier');
    const { agent: cashierAgent } = await loginAs(cashier.email);

    const { policy, version: v1 } = await draftPolicy(sa);
    await sa.post(`/api/policies/versions/${v1.id}/submit`);
    await owner.post(`/api/policies/versions/${v1.id}/approve`).send({});
    await sa.post(`/api/policies/versions/${v1.id}/publish`).send({ roles: ['cashier', 'stock_staff'] });
    await cashierAgent.post(`/api/policies/versions/${v1.id}/acknowledge`);

    // Service refuses the edit ...
    expect((await sa.patch(`/api/policies/versions/${v1.id}`).send({ content: 'rewritten after publication, long enough to pass validation' })).status).toBe(409);
    // ... and so does the trigger when the app role tries directly.
    await expect(rootError(db.update(policyVersions).set({ content: 'tampered' }).where(eq(policyVersions.id, v1.id)))).rejects.toThrow(/published and cannot be edited/);
    await expect(rootError(db.update(policyVersions).set({ status: 'draft' }).where(eq(policyVersions.id, v1.id)))).rejects.toThrow(/only become superseded/);
    await expect(rootError(db.delete(policyVersions).where(eq(policyVersions.id, v1.id)))).rejects.toThrow(/cannot be deleted/);

    // Version 2: cashier's earlier acknowledgement stays on v1; v2 is pending again.
    const v2 = await sa.post(`/api/policies/${policy.id}/versions`).send({ title: 'Acceptable Use Policy', content: CONTENT + '\n\nUSB sticks are not permitted on tills.', changeNote: 'Added USB rule' });
    expect(v2.status).toBe(201);
    expect(v2.body.version.versionNo).toBe(2);
    // Only one version in flight at a time.
    expect((await sa.post(`/api/policies/${policy.id}/versions`).send({ title: 'Acceptable Use Policy', content: CONTENT })).status).toBe(409);

    await sa.post(`/api/policies/versions/${v2.body.version.id}/submit`);
    await owner.post(`/api/policies/versions/${v2.body.version.id}/approve`).send({});
    const pub = await sa.post(`/api/policies/versions/${v2.body.version.id}/publish`).send({ roles: ['cashier'] });
    expect(pub.status).toBe(200);

    const [old] = await db.select().from(policyVersions).where(eq(policyVersions.id, v1.id));
    expect(old!.status).toBe('superseded');
    const assigned = await cashierAgent.get('/api/policies/assigned');
    expect(assigned.body.policies).toHaveLength(1);
    expect(assigned.body.policies[0].versionNo).toBe(2);
    expect(assigned.body.policies[0].acknowledgedAt).toBeNull();
    // The old wording is still readable, still shows the recorded acknowledgement, but cannot be re-acknowledged.
    const oldRead = await cashierAgent.get(`/api/policies/versions/${v1.id}`);
    expect(oldRead.status).toBe(200);
    expect(oldRead.body.acknowledgedAt).not.toBeNull();
    expect(oldRead.body.canAcknowledge).toBe(false);
    expect((await cashierAgent.post(`/api/policies/versions/${v1.id}/acknowledge`)).status).toBe(409);

    // Register shows v2 live with no version in flight.
    const list = await sa.get('/api/policies');
    expect(list.body.policies[0].published.versionNo).toBe(2);
    expect(list.body.policies[0].inFlight).toBeNull();
    expect(list.body.policies[0].versionCount).toBe(2);
  });
});

// Drizzle wraps driver errors ("Failed query: ..."); the trigger's message is on the innermost cause.
function rootError<T>(p: Promise<T>) {
  return p.catch((e: unknown) => {
    let cur = e as { cause?: unknown; message?: string } | undefined;
    while (cur && typeof cur === 'object' && cur.cause) cur = cur.cause as typeof cur;
    return Promise.reject(new Error(cur?.message ?? String(e)));
  });
}
