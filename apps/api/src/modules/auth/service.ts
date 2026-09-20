import { and, eq, isNull } from 'drizzle-orm';
import { generateSecret, generateURI, verify as verifyTotp } from 'otplib';
import QRCode from 'qrcode';
import { TOTP_REQUIRED_ROLES, type Role } from '@secureshelf/shared';
import { db } from '../../db/client.js';
import { sessions, users } from '../../db/schema/index.js';
import { withTx } from '../../lib/tx.js';
import { audit } from '../../lib/audit.js';
import { dummyVerify, verifyPassword, sha256Hex, randomId, encryptField, decryptField } from '../../lib/crypto.js';
import { REFRESH_TTL_SEC, signAccess, signRefresh, verifyRefresh } from '../../lib/tokens.js';
import { AppError, unauthorized, conflict, badRequest } from '../../lib/errors.js';
import { permissionsFor } from '../../lib/permissions.js';

// FR-02: five failures lock the account. FR-02 also requires the same error for an unknown
// email and a wrong password; only a *locked* account gets a distinct message (plan A5).
export const MAX_FAILED_ATTEMPTS = 5;
const INVALID = 'Invalid email or password';
const LOCKED = 'This account is locked after too many failed attempts. Contact your Security Administrator.';

type Meta = { ip: string | null; userAgent: string | null };

export type LoginOutcome =
  | { kind: 'session'; user: PublicUser; access: string; refresh: string }
  | { kind: 'totp_required'; userId: number; enrolled: boolean };

export type PublicUser = {
  id: number;
  email: string;
  fullName: string;
  role: Role;
  totpEnabled: boolean;
  permissions: readonly string[];
};

export const toPublicUser = (u: typeof users.$inferSelect): PublicUser => ({
  id: u.id,
  email: u.email,
  fullName: u.fullName,
  role: u.role,
  totpEnabled: u.totpEnabled,
  permissions: permissionsFor(u.role),
});

export async function login(email: string, password: string, meta: Meta): Promise<LoginOutcome> {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!user) {
    await dummyVerify(); // constant-time-ish: unknown email costs the same as a wrong password
    await withTx((tx) => audit(tx, { actor: null, action: 'auth.login_failed', entity: 'user', details: { email, reason: 'unknown_email' }, ip: meta.ip }));
    throw unauthorized(INVALID);
  }

  if (user.status !== 'active') {
    await withTx((tx) => audit(tx, { actor: null, action: 'auth.login_failed', entity: 'user', entityId: user.id, details: { reason: user.status }, ip: meta.ip }));
    throw unauthorized(INVALID);
  }

  if (user.lockedAt) {
    await withTx((tx) => audit(tx, { actor: null, action: 'auth.login_failed', entity: 'user', entityId: user.id, details: { reason: 'locked' }, ip: meta.ip }));
    throw new AppError(423, LOCKED, 'account_locked');
  }

  const ok = await verifyPassword(user.passwordHash, password);
  if (!ok) {
    const attempts = user.failedAttempts + 1;
    const lock = attempts >= MAX_FAILED_ATTEMPTS;
    await withTx(async (tx) => {
      await tx
        .update(users)
        .set({ failedAttempts: attempts, lockedAt: lock ? new Date() : null, updatedAt: new Date() })
        .where(eq(users.id, user.id));
      await audit(tx, {
        actor: null,
        action: lock ? 'auth.account_locked' : 'auth.login_failed',
        entity: 'user',
        entityId: user.id,
        details: { reason: 'wrong_password', failedAttempts: attempts },
        ip: meta.ip,
      });
    });
    if (lock) throw new AppError(423, LOCKED, 'account_locked');
    throw unauthorized(INVALID);
  }

  // Password is right. Reset the counter now; the second factor (if any) has its own limiter.
  if (user.failedAttempts > 0) {
    await db.update(users).set({ failedAttempts: 0, updatedAt: new Date() }).where(eq(users.id, user.id));
  }

  if (TOTP_REQUIRED_ROLES.includes(user.role)) {
    await withTx((tx) =>
      audit(tx, { actor: { id: user.id, role: user.role }, action: 'auth.password_ok_totp_pending', entity: 'user', entityId: user.id, details: { enrolled: user.totpEnabled }, ip: meta.ip }),
    );
    return { kind: 'totp_required', userId: user.id, enrolled: user.totpEnabled };
  }

  return createSession(user, meta, 'password');
}

async function createSession(user: typeof users.$inferSelect, meta: Meta, method: 'password' | 'totp'): Promise<LoginOutcome> {
  const sid = randomId();
  const refresh = signRefresh({ sub: user.id, sid });
  const access = signAccess({ sub: user.id, sid, role: user.role });

  await withTx(async (tx) => {
    await tx.insert(sessions).values({
      id: sid,
      userId: user.id,
      refreshHash: sha256Hex(refresh),
      ip: meta.ip,
      userAgent: meta.userAgent,
      expiresAt: new Date(Date.now() + REFRESH_TTL_SEC * 1000),
    });
    await audit(tx, { actor: { id: user.id, role: user.role }, action: 'auth.login', entity: 'session', entityId: sid, details: { method }, ip: meta.ip });
  });

  return { kind: 'session', user: toPublicUser(user), access, refresh };
}

// FR-03: enrolment for Owner / Security Admin. The secret is generated server-side and
// stored encrypted; the client only ever sees the QR (or the manual key) once.
export async function beginTotpEnrolment(userId: number) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user || user.status !== 'active') throw unauthorized();
  if (user.totpEnabled) throw conflict('Two-factor authentication is already enabled for this account');

  const secret = generateSecret();
  await db.update(users).set({ totpSecretEnc: encryptField(secret), updatedAt: new Date() }).where(eq(users.id, userId));

  const uri = generateURI({ issuer: 'SecureShelf', label: user.email, secret });
  const qrDataUrl = await QRCode.toDataURL(uri, { margin: 1, width: 220 });
  return { qrDataUrl, manualKey: secret };
}

export async function confirmTotpEnrolment(userId: number, code: string, meta: Meta): Promise<LoginOutcome> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user || user.status !== 'active') throw unauthorized();
  if (user.totpEnabled) throw conflict('Two-factor authentication is already enabled');
  const secret = decryptField(user.totpSecretEnc);
  if (!secret) throw badRequest('Start enrolment first');

  const result = await verifyTotp({ secret, token: code });
  if (!result.valid) throw unauthorized('That code is not valid. Check the time on your phone and try again.');

  await withTx(async (tx) => {
    await tx.update(users).set({ totpEnabled: true, updatedAt: new Date() }).where(eq(users.id, userId));
    await audit(tx, { actor: { id: user.id, role: user.role }, action: 'auth.totp_enrolled', entity: 'user', entityId: user.id, ip: meta.ip });
  });
  return createSession({ ...user, totpEnabled: true }, meta, 'totp');
}

export async function verifyTotpLogin(userId: number, code: string, meta: Meta): Promise<LoginOutcome> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user || user.status !== 'active' || user.lockedAt) throw unauthorized();
  if (!user.totpEnabled) throw badRequest('Two-factor authentication is not enrolled for this account');
  const secret = decryptField(user.totpSecretEnc);
  if (!secret) throw unauthorized();

  const result = await verifyTotp({ secret, token: code });
  if (!result.valid) {
    await withTx((tx) => audit(tx, { actor: { id: user.id, role: user.role }, action: 'auth.totp_failed', entity: 'user', entityId: user.id, ip: meta.ip }));
    throw unauthorized('That code is not valid. Try the next one from your app.');
  }
  return createSession(user, meta, 'totp');
}

// NFR-02: refresh rotation. The presented refresh token must hash-match the live session
// row; the row is then updated with the new token's hash so a replayed old token fails.
export async function refresh(refreshToken: string, meta: Meta) {
  const claims = verifyRefresh(refreshToken);
  if (!claims) throw unauthorized('Session expired');

  const [row] = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, claims.sid), isNull(sessions.revokedAt)))
    .limit(1);

  if (!row || row.session.userId !== claims.sub || row.session.expiresAt < new Date()) throw unauthorized('Session expired');
  if (row.user.status !== 'active' || row.user.lockedAt) throw unauthorized('Session is no longer valid');

  if (row.session.refreshHash !== sha256Hex(refreshToken)) {
    // A token that was already rotated is being replayed: kill the session outright.
    await withTx(async (tx) => {
      await tx.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, claims.sid));
      await audit(tx, { actor: { id: row.user.id, role: row.user.role }, action: 'auth.refresh_replay_detected', entity: 'session', entityId: claims.sid, ip: meta.ip });
    });
    throw unauthorized('Session is no longer valid');
  }

  const newRefresh = signRefresh({ sub: row.user.id, sid: claims.sid });
  const newAccess = signAccess({ sub: row.user.id, sid: claims.sid, role: row.user.role });
  await db.update(sessions).set({ refreshHash: sha256Hex(newRefresh), lastUsedAt: new Date(), ip: meta.ip }).where(eq(sessions.id, claims.sid));

  return { user: toPublicUser(row.user), access: newAccess, refresh: newRefresh };
}

export async function logout(sessionId: string, actor: { id: number; role: Role }, meta: Meta) {
  await withTx(async (tx) => {
    await tx.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, sessionId));
    await audit(tx, { actor, action: 'auth.logout', entity: 'session', entityId: sessionId, ip: meta.ip });
  });
}

export async function me(userId: number): Promise<PublicUser> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw unauthorized();
  return toPublicUser(user);
}
