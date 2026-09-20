import { and, eq, isNull, isNotNull, desc } from 'drizzle-orm';
import type { CreateUserInput, UpdateUserInput, UserStatus, Role } from '@secureshelf/shared';
import { db } from '../../db/client.js';
import { sessions, users } from '../../db/schema/index.js';
import { withTx } from '../../lib/tx.js';
import { audit, type Actor } from '../../lib/audit.js';
import { hashPassword, encryptField, decryptField, maskTail } from '../../lib/crypto.js';
import { conflict, notFoundError, badRequest } from '../../lib/errors.js';

type Meta = { ip: string | null };

// What an account administrator sees. Encrypted fields are decrypted only here, for
// users.manage callers; everyone else in the app only ever sees a name and a role.
export function toAdminView(u: typeof users.$inferSelect, reveal: boolean) {
  const nic = decryptField(u.nicEnc);
  const phone = decryptField(u.phoneEnc);
  const contact = decryptField(u.contactEnc);
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    jobTitle: u.jobTitle,
    role: u.role,
    status: u.status,
    failedAttempts: u.failedAttempts,
    lockedAt: u.lockedAt,
    totpEnabled: u.totpEnabled,
    createdAt: u.createdAt,
    nic: reveal ? nic : maskTail(nic),
    phone: reveal ? phone : maskTail(phone),
    contact: reveal ? contact : contact ? '••••' : null,
  };
}

export async function listUsers(reveal: boolean) {
  const rows = await db.select().from(users).orderBy(users.fullName);
  return rows.map((u) => toAdminView(u, reveal));
}

export async function getUser(id: number, reveal: boolean) {
  const [u] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!u) throw notFoundError('User');
  return toAdminView(u, reveal);
}

// FR-05 create.
export async function createUser(input: CreateUserInput, actor: Actor, meta: Meta) {
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1);
  if (existing) throw conflict('An account with that email already exists');

  const passwordHash = await hashPassword(input.password);
  return withTx(async (tx) => {
    const [created] = await tx
      .insert(users)
      .values({
        email: input.email,
        fullName: input.fullName,
        role: input.role,
        passwordHash,
        jobTitle: input.jobTitle ?? null,
        nicEnc: encryptField(input.nic),
        phoneEnc: encryptField(input.phone),
        contactEnc: encryptField(input.contact),
      })
      .returning();
    await audit(tx, { actor, action: 'user.create', entity: 'user', entityId: created!.id, details: { email: created!.email, role: created!.role }, ip: meta.ip });
    return toAdminView(created!, true);
  });
}

export async function updateUser(id: number, input: UpdateUserInput, actor: Actor, meta: Meta) {
  const [u] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!u) throw notFoundError('User');

  const changed: string[] = [];
  const patch: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
  if (input.fullName !== undefined && input.fullName !== u.fullName) (patch.fullName = input.fullName), changed.push('fullName');
  if ('jobTitle' in input) (patch.jobTitle = input.jobTitle ?? null), changed.push('jobTitle');
  if ('nic' in input) (patch.nicEnc = encryptField(input.nic)), changed.push('nic');
  if ('phone' in input) (patch.phoneEnc = encryptField(input.phone)), changed.push('phone');
  if ('contact' in input) (patch.contactEnc = encryptField(input.contact)), changed.push('contact');

  return withTx(async (tx) => {
    const [updated] = await tx.update(users).set(patch).where(eq(users.id, id)).returning();
    await audit(tx, { actor, action: 'user.update', entity: 'user', entityId: id, details: { fields: changed }, ip: meta.ip });
    return toAdminView(updated!, true);
  });
}

// FR-05 suspend / offboard / reactivate. Leaving `active` revokes every live session so the
// account is out immediately, not when its access token expires (L5: removal of access rights).
export async function setStatus(id: number, status: UserStatus, reason: string | undefined, actor: Actor, meta: Meta) {
  const [u] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!u) throw notFoundError('User');
  if (actor?.id === id) throw badRequest('You cannot change the status of your own account');
  if (u.status === 'offboarded' && status !== 'offboarded') throw badRequest('An offboarded account cannot be reactivated. Create a new account instead.');

  return withTx(async (tx) => {
    const [updated] = await tx.update(users).set({ status, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    let revoked = 0;
    if (status !== 'active') {
      const r = await tx.update(sessions).set({ revokedAt: new Date() }).where(and(eq(sessions.userId, id), isNull(sessions.revokedAt))).returning({ id: sessions.id });
      revoked = r.length;
    }
    await audit(tx, { actor, action: `user.${status}`, entity: 'user', entityId: id, details: { from: u.status, reason: reason ?? null, sessionsRevoked: revoked }, ip: meta.ip });
    return toAdminView(updated!, true);
  });
}

// FR-02 / FR-05: only an account administrator can clear a lockout (plan A3).
export async function unlock(id: number, actor: Actor, meta: Meta) {
  const [u] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!u) throw notFoundError('User');
  if (!u.lockedAt && u.failedAttempts === 0) throw badRequest('This account is not locked');

  return withTx(async (tx) => {
    const [updated] = await tx.update(users).set({ lockedAt: null, failedAttempts: 0, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    await audit(tx, { actor, action: 'user.unlock', entity: 'user', entityId: id, ip: meta.ip });
    return toAdminView(updated!, true);
  });
}

// FR-03 recovery path: forces re-enrolment on the next login.
export async function resetTotp(id: number, actor: Actor, meta: Meta) {
  const [u] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!u) throw notFoundError('User');

  return withTx(async (tx) => {
    const [updated] = await tx.update(users).set({ totpEnabled: false, totpSecretEnc: null, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    const r = await tx.update(sessions).set({ revokedAt: new Date() }).where(and(eq(sessions.userId, id), isNull(sessions.revokedAt))).returning({ id: sessions.id });
    await audit(tx, { actor, action: 'user.totp_reset', entity: 'user', entityId: id, details: { sessionsRevoked: r.length }, ip: meta.ip });
    return toAdminView(updated!, true);
  });
}

export async function listLockouts() {
  const rows = await db.select().from(users).where(isNotNull(users.lockedAt)).orderBy(desc(users.lockedAt));
  return rows.map((u) => toAdminView(u, false));
}

export async function listSessions(userId: number) {
  return db
    .select({ id: sessions.id, ip: sessions.ip, userAgent: sessions.userAgent, createdAt: sessions.createdAt, lastUsedAt: sessions.lastUsedAt, expiresAt: sessions.expiresAt, revokedAt: sessions.revokedAt })
    .from(sessions)
    .where(eq(sessions.userId, userId))
    .orderBy(desc(sessions.createdAt))
    .limit(20);
}

export type { Role };
