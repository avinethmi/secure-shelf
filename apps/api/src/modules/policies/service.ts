import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { CreatePolicyInput, CreateVersionInput, UpdateVersionInput, PolicyVersionStatus, Role } from '@secureshelf/shared';
import { db } from '../../db/client.js';
import { policies, policyVersions, policyVersionRoles, policyAcknowledgements, users } from '../../db/schema/index.js';
import { withTx } from '../../lib/tx.js';
import { audit } from '../../lib/audit.js';
import { hasPermission } from '../../lib/permissions.js';
import { conflict, forbidden, notFoundError } from '../../lib/errors.js';

type Meta = { ip: string | null };
type Caller = { id: number; role: Role };

// Proposal Figure 2. A version moves forward one step at a time; "changes requested" is the
// only way back, and nothing leaves published except to superseded (also enforced by the
// policy_versions_lock_published trigger).
const IN_FLIGHT: readonly PolicyVersionStatus[] = ['draft', 'review', 'approved'];

// Owner, Security Admin: anyone who can touch the lifecycle sees the whole register.
export const canManagePolicies = (role: Role) => hasPermission(role, 'policy.write') || hasPermission(role, 'policy.approve') || hasPermission(role, 'policy.publish');

type VersionRow = typeof policyVersions.$inferSelect;

function assertStatus(v: VersionRow, allowed: PolicyVersionStatus[], action: string) {
  if (!allowed.includes(v.status)) throw conflict(`Cannot ${action}: version ${v.versionNo} is ${v.status.replace('_', ' ')}`);
}

async function loadVersion(vid: number) {
  const [v] = await db.select().from(policyVersions).where(eq(policyVersions.id, vid)).limit(1);
  if (!v) throw notFoundError('Policy version');
  return v;
}

async function loadPolicy(id: number) {
  const [p] = await db.select().from(policies).where(eq(policies.id, id)).limit(1);
  if (!p) throw notFoundError('Policy');
  return p;
}

const author = alias(users, 'author');
const approver = alias(users, 'approver');

// Version summary without content: what lists and the detail page show.
const versionSummary = {
  id: policyVersions.id,
  policyId: policyVersions.policyId,
  versionNo: policyVersions.versionNo,
  title: policyVersions.title,
  changeNote: policyVersions.changeNote,
  status: policyVersions.status,
  authorId: policyVersions.authorId,
  authorName: author.fullName,
  approverId: policyVersions.approverId,
  approverName: approver.fullName,
  reviewNote: policyVersions.reviewNote,
  submittedAt: policyVersions.submittedAt,
  approvedAt: policyVersions.approvedAt,
  publishedAt: policyVersions.publishedAt,
  createdAt: policyVersions.createdAt,
  updatedAt: policyVersions.updatedAt,
};

async function rolesFor(versionIds: number[]) {
  if (!versionIds.length) return new Map<number, Role[]>();
  const rows = await db.select().from(policyVersionRoles).where(inArray(policyVersionRoles.versionId, versionIds));
  const map = new Map<number, Role[]>();
  for (const r of rows) map.set(r.versionId, [...(map.get(r.versionId) ?? []), r.role]);
  return map;
}

// Register view (Owner / Security Admin): every policy with its live version and whatever is
// in flight, so the review queue and drafts are visible from one list.
export async function listPolicies() {
  const ps = await db.select().from(policies).orderBy(asc(policies.code));
  const vs = await db
    .select(versionSummary)
    .from(policyVersions)
    .leftJoin(author, eq(author.id, policyVersions.authorId))
    .leftJoin(approver, eq(approver.id, policyVersions.approverId))
    .orderBy(desc(policyVersions.versionNo));
  const roles = await rolesFor(vs.filter((v) => v.status === 'published').map((v) => v.id));

  return ps.map((p) => {
    const mine = vs.filter((v) => v.policyId === p.id);
    const published = mine.find((v) => v.status === 'published') ?? null;
    const inFlight = mine.find((v) => IN_FLIGHT.includes(v.status)) ?? null;
    return {
      ...p,
      versionCount: mine.length,
      published: published ? { ...published, roles: roles.get(published.id) ?? [] } : null,
      inFlight,
    };
  });
}

// FR-09 from the reader's side: published versions assigned to my role, with my acknowledgement.
export async function listAssigned(caller: Caller) {
  return db
    .select({
      policyId: policies.id,
      code: policies.code,
      type: policies.type,
      classification: policies.classification,
      versionId: policyVersions.id,
      versionNo: policyVersions.versionNo,
      title: policyVersions.title,
      publishedAt: policyVersions.publishedAt,
      acknowledgedAt: policyAcknowledgements.acknowledgedAt,
    })
    .from(policyVersionRoles)
    .innerJoin(policyVersions, and(eq(policyVersions.id, policyVersionRoles.versionId), eq(policyVersions.status, 'published')))
    .innerJoin(policies, eq(policies.id, policyVersions.policyId))
    .leftJoin(policyAcknowledgements, and(eq(policyAcknowledgements.versionId, policyVersions.id), eq(policyAcknowledgements.userId, caller.id)))
    .where(eq(policyVersionRoles.role, caller.role))
    .orderBy(asc(policies.code));
}

async function isAssignedTo(versionId: number, role: Role) {
  const [r] = await db
    .select({ v: policyVersionRoles.versionId })
    .from(policyVersionRoles)
    .where(and(eq(policyVersionRoles.versionId, versionId), eq(policyVersionRoles.role, role)))
    .limit(1);
  return !!r;
}

// Policy with its version history. Staff only see a policy that has been published to their
// role, and only its published or superseded versions (never a draft in progress).
export async function getPolicy(id: number, caller: Caller) {
  const p = await loadPolicy(id);
  const vs = await db
    .select(versionSummary)
    .from(policyVersions)
    .leftJoin(author, eq(author.id, policyVersions.authorId))
    .leftJoin(approver, eq(approver.id, policyVersions.approverId))
    .where(eq(policyVersions.policyId, id))
    .orderBy(desc(policyVersions.versionNo));
  const roles = await rolesFor(vs.map((v) => v.id));
  const withRoles = vs.map((v) => ({ ...v, roles: roles.get(v.id) ?? [] }));

  if (!canManagePolicies(caller.role)) {
    const visible = withRoles.filter((v) => (v.status === 'published' || v.status === 'superseded') && v.roles.includes(caller.role));
    if (!visible.length) throw notFoundError('Policy');
    return { policy: p, versions: visible };
  }
  return { policy: p, versions: withRoles };
}

// Full text of one version for the reader / editor, plus the caller's acknowledgement.
export async function getVersion(vid: number, caller: Caller) {
  const v = await loadVersion(vid);
  const roles = (await rolesFor([vid])).get(vid) ?? [];
  if (!canManagePolicies(caller.role)) {
    const readable = (v.status === 'published' || v.status === 'superseded') && roles.includes(caller.role);
    if (!readable) throw notFoundError('Policy version');
  }
  const p = await loadPolicy(v.policyId);
  const [ack] = await db
    .select()
    .from(policyAcknowledgements)
    .where(and(eq(policyAcknowledgements.versionId, vid), eq(policyAcknowledgements.userId, caller.id)))
    .limit(1);
  const [a] = await db.select({ fullName: users.fullName }).from(users).where(eq(users.id, v.authorId)).limit(1);
  return {
    version: { ...v, roles, authorName: a?.fullName ?? null },
    policy: p,
    acknowledgedAt: ack?.acknowledgedAt ?? null,
    canAcknowledge: v.status === 'published' && roles.includes(caller.role),
  };
}

async function nextPolicyCode() {
  const [last] = await db.select({ code: policies.code }).from(policies).orderBy(desc(policies.id)).limit(1);
  const n = last ? Number(last.code.replace(/\D/g, '')) || 0 : 0;
  return `POL-${String(n + 1).padStart(3, '0')}`;
}

// FR-06: a new policy always starts as draft version 1.
export async function createPolicy(input: CreatePolicyInput, caller: Caller, meta: Meta) {
  const code = await nextPolicyCode();
  return withTx(async (tx) => {
    const [p] = await tx
      .insert(policies)
      .values({ code, title: input.title, type: input.type, classification: input.classification, createdBy: caller.id })
      .returning();
    const [v] = await tx
      .insert(policyVersions)
      .values({ policyId: p!.id, versionNo: 1, title: input.title, content: input.content, changeNote: input.changeNote ?? 'Initial draft', authorId: caller.id })
      .returning();
    await audit(tx, {
      actor: caller,
      action: 'policy.create',
      entity: 'policy',
      entityId: p!.id,
      details: { code, title: input.title, type: input.type, classification: input.classification, versionId: v!.id },
      ip: meta.ip,
    });
    return { policy: p!, version: v! };
  });
}

// FR-07: a change to a live policy is a new numbered draft; only one version may be in flight.
export async function createVersion(policyId: number, input: CreateVersionInput, caller: Caller, meta: Meta) {
  await loadPolicy(policyId);
  return withTx(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${policyId})`);
    const [inFlight] = await tx
      .select({ id: policyVersions.id, versionNo: policyVersions.versionNo, status: policyVersions.status })
      .from(policyVersions)
      .where(and(eq(policyVersions.policyId, policyId), inArray(policyVersions.status, [...IN_FLIGHT])))
      .limit(1);
    if (inFlight) throw conflict(`Version ${inFlight.versionNo} is still ${inFlight.status}. Finish or publish it before starting another.`);
    const [row] = await tx
      .select({ max: sql<number>`coalesce(max(${policyVersions.versionNo}), 0)` })
      .from(policyVersions)
      .where(eq(policyVersions.policyId, policyId));
    const versionNo = Number(row?.max ?? 0) + 1;
    const [v] = await tx
      .insert(policyVersions)
      .values({ policyId, versionNo, title: input.title, content: input.content, changeNote: input.changeNote ?? null, authorId: caller.id })
      .returning();
    await audit(tx, { actor: caller, action: 'policy.version_create', entity: 'policy_version', entityId: v!.id, details: { policyId, versionNo }, ip: meta.ip });
    return v!;
  });
}

export async function updateVersion(vid: number, input: UpdateVersionInput, caller: Caller, meta: Meta) {
  const v = await loadVersion(vid);
  assertStatus(v, ['draft'], 'edit');
  const patch: Partial<typeof policyVersions.$inferInsert> = { updatedAt: new Date() };
  const changed: string[] = [];
  if (input.title !== undefined && input.title !== v.title) (patch.title = input.title), changed.push('title');
  if (input.content !== undefined && input.content !== v.content) (patch.content = input.content), changed.push('content');
  if ('changeNote' in input) (patch.changeNote = input.changeNote ?? null), changed.push('changeNote');
  return withTx(async (tx) => {
    const [updated] = await tx.update(policyVersions).set(patch).where(eq(policyVersions.id, vid)).returning();
    await audit(tx, { actor: caller, action: 'policy.version_update', entity: 'policy_version', entityId: vid, details: { fields: changed }, ip: meta.ip });
    return updated!;
  });
}

// draft -> review
export async function submitVersion(vid: number, caller: Caller, meta: Meta) {
  const v = await loadVersion(vid);
  assertStatus(v, ['draft'], 'submit for review');
  return withTx(async (tx) => {
    const [updated] = await tx
      .update(policyVersions)
      .set({ status: 'review', submittedAt: new Date(), reviewNote: null, updatedAt: new Date() })
      .where(eq(policyVersions.id, vid))
      .returning();
    await audit(tx, { actor: caller, action: 'policy.submit', entity: 'policy_version', entityId: vid, details: { policyId: v.policyId, versionNo: v.versionNo }, ip: meta.ip });
    return updated!;
  });
}

// review -> draft, with the reviewer's note so the author knows what to fix.
export async function requestChanges(vid: number, note: string, caller: Caller, meta: Meta) {
  const v = await loadVersion(vid);
  assertStatus(v, ['review'], 'request changes');
  return withTx(async (tx) => {
    const [updated] = await tx.update(policyVersions).set({ status: 'draft', reviewNote: note, updatedAt: new Date() }).where(eq(policyVersions.id, vid)).returning();
    await audit(tx, {
      actor: caller,
      action: 'policy.request_changes',
      entity: 'policy_version',
      entityId: vid,
      details: { policyId: v.policyId, versionNo: v.versionNo, note },
      ip: meta.ip,
    });
    return updated!;
  });
}

// review -> approved. FR-08: the author can never approve their own version, whatever their role.
export async function approveVersion(vid: number, note: string | undefined, caller: Caller, meta: Meta) {
  const v = await loadVersion(vid);
  assertStatus(v, ['review'], 'approve');
  if (v.authorId === caller.id) throw forbidden('You wrote this version, so someone else must approve it');
  return withTx(async (tx) => {
    const [updated] = await tx
      .update(policyVersions)
      .set({ status: 'approved', approverId: caller.id, approvedAt: new Date(), reviewNote: note ?? null, updatedAt: new Date() })
      .where(eq(policyVersions.id, vid))
      .returning();
    await audit(tx, {
      actor: caller,
      action: 'policy.approve',
      entity: 'policy_version',
      entityId: vid,
      details: { policyId: v.policyId, versionNo: v.versionNo, authorId: v.authorId },
      ip: meta.ip,
    });
    return updated!;
  });
}

// approved -> published. The previously published version becomes superseded; its
// acknowledgements stay attached to it (proposal Figure 2), so the new wording needs new ones.
export async function publishVersion(vid: number, roles: Role[], caller: Caller, meta: Meta) {
  const v = await loadVersion(vid);
  assertStatus(v, ['approved'], 'publish');
  return withTx(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${v.policyId})`);
    const superseded = await tx
      .update(policyVersions)
      .set({ status: 'superseded', updatedAt: new Date() })
      .where(and(eq(policyVersions.policyId, v.policyId), eq(policyVersions.status, 'published')))
      .returning({ id: policyVersions.id, versionNo: policyVersions.versionNo });
    const now = new Date();
    const [updated] = await tx.update(policyVersions).set({ status: 'published', publishedAt: now, updatedAt: now }).where(eq(policyVersions.id, vid)).returning();
    await tx.insert(policyVersionRoles).values(roles.map((role) => ({ versionId: vid, role })));
    await tx.update(policies).set({ title: v.title }).where(eq(policies.id, v.policyId));
    await audit(tx, {
      actor: caller,
      action: 'policy.publish',
      entity: 'policy_version',
      entityId: vid,
      details: { policyId: v.policyId, versionNo: v.versionNo, roles, superseded: superseded.map((s) => s.versionNo) },
      ip: meta.ip,
    });
    return { ...updated!, roles };
  });
}

// FR-09: user + version + time. Idempotent: a second click returns the first record.
export async function acknowledgeVersion(vid: number, caller: Caller, meta: Meta) {
  const v = await loadVersion(vid);
  if (v.status !== 'published') throw conflict('Only the current published version can be acknowledged');
  if (!(await isAssignedTo(vid, caller.role))) throw forbidden('This policy is not assigned to your role');
  const [existing] = await db
    .select()
    .from(policyAcknowledgements)
    .where(and(eq(policyAcknowledgements.versionId, vid), eq(policyAcknowledgements.userId, caller.id)))
    .limit(1);
  if (existing) return { acknowledgedAt: existing.acknowledgedAt, alreadyAcknowledged: true };
  return withTx(async (tx) => {
    const [row] = await tx.insert(policyAcknowledgements).values({ userId: caller.id, versionId: vid }).onConflictDoNothing().returning();
    // Lost a race with a double-click: the other insert won, nothing new to record.
    if (!row) return { acknowledgedAt: new Date(), alreadyAcknowledged: true };
    await audit(tx, { actor: caller, action: 'policy.acknowledge', entity: 'policy_version', entityId: vid, details: { policyId: v.policyId, versionNo: v.versionNo }, ip: meta.ip });
    return { acknowledgedAt: row.acknowledgedAt, alreadyAcknowledged: false };
  });
}

// Who has and has not acknowledged the live version: every active user in an assigned role.
export async function acknowledgementStatus(policyId: number) {
  await loadPolicy(policyId);
  const [v] = await db
    .select()
    .from(policyVersions)
    .where(and(eq(policyVersions.policyId, policyId), eq(policyVersions.status, 'published')))
    .limit(1);
  if (!v) return { version: null, people: [], summary: { total: 0, acknowledged: 0 } };
  const roles = (await rolesFor([v.id])).get(v.id) ?? [];
  const people = roles.length
    ? await db
        .select({ userId: users.id, fullName: users.fullName, role: users.role, acknowledgedAt: policyAcknowledgements.acknowledgedAt })
        .from(users)
        .leftJoin(policyAcknowledgements, and(eq(policyAcknowledgements.userId, users.id), eq(policyAcknowledgements.versionId, v.id)))
        .where(and(inArray(users.role, roles), eq(users.status, 'active')))
        .orderBy(asc(users.role), asc(users.fullName))
    : [];
  return {
    version: { id: v.id, versionNo: v.versionNo, title: v.title, publishedAt: v.publishedAt, roles },
    people,
    summary: { total: people.length, acknowledged: people.filter((p) => p.acknowledgedAt).length },
  };
}
