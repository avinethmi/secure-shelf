import { sql, desc } from 'drizzle-orm';
import type { Role } from '@secureshelf/shared';
import { auditEvents } from '../db/schema/index.js';
import { db, type Tx } from '../db/client.js';
import { sha256Hex } from './crypto.js';

// FR-19 and proposal §5.3: hash-chained, append-only audit log.
//
// hash = sha256(prev_hash + "|" + canonical JSON of the event fields)
//
// Appends are serialised with a transaction-scoped advisory lock so two concurrent requests
// cannot both read the same "last hash" and fork the chain. The lock is released at commit.

export const GENESIS_HASH = '0'.repeat(64);
const AUDIT_LOCK_KEY = 7_201_204; // arbitrary constant, only has to be unique in this DB

export type Actor = { id: number; role: Role } | null;

export type AuditInput = {
  actor: Actor;
  action: string; // e.g. "auth.login", "policy.publish"
  entity: string; // e.g. "user", "policy_version"
  entityId?: string | number | null;
  details?: Record<string, unknown>;
  ip?: string | null;
};

// Deterministic JSON: keys sorted recursively so the same data always hashes the same.
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(',')}}`;
}

export function computeHash(prevHash: string, row: { at: Date; actorId: number | null; actorRole: string | null; action: string; entity: string; entityId: string | null; details: unknown; ip: string | null }) {
  const payload = canonicalJson({
    at: row.at.toISOString(),
    actorId: row.actorId,
    actorRole: row.actorRole,
    action: row.action,
    entity: row.entity,
    entityId: row.entityId,
    details: row.details ?? {},
    ip: row.ip,
  });
  return sha256Hex(`${prevHash}|${payload}`);
}

export async function audit(tx: Tx, input: AuditInput) {
  await tx.execute(sql`select pg_advisory_xact_lock(${AUDIT_LOCK_KEY})`);
  const last = await tx.select({ hash: auditEvents.hash }).from(auditEvents).orderBy(desc(auditEvents.id)).limit(1);
  const prevHash = last[0]?.hash ?? GENESIS_HASH;

  const row = {
    at: new Date(),
    actorId: input.actor?.id ?? null,
    actorRole: input.actor?.role ?? null,
    action: input.action,
    entity: input.entity,
    entityId: input.entityId === undefined || input.entityId === null ? null : String(input.entityId),
    details: input.details ?? {},
    ip: input.ip ?? null,
  };
  const hash = computeHash(prevHash, row);
  const [inserted] = await tx.insert(auditEvents).values({ ...row, prevHash, hash }).returning({ id: auditEvents.id });
  return inserted!.id;
}

// Walks the whole chain and reports the first row whose stored hash does not match a
// recomputation, or whose prev_hash does not equal the previous row's hash.
export async function verifyChain() {
  const rows = await db.select().from(auditEvents).orderBy(auditEvents.id);
  let prev = GENESIS_HASH;
  for (const r of rows) {
    if (r.prevHash !== prev) return { ok: false as const, checked: rows.length, firstBrokenId: r.id, reason: 'prev_hash mismatch' };
    const expected = computeHash(prev, { at: r.at, actorId: r.actorId, actorRole: r.actorRole, action: r.action, entity: r.entity, entityId: r.entityId, details: r.details, ip: r.ip });
    if (expected !== r.hash) return { ok: false as const, checked: rows.length, firstBrokenId: r.id, reason: 'hash mismatch' };
    prev = r.hash;
  }
  return { ok: true as const, checked: rows.length, lastHash: prev };
}
