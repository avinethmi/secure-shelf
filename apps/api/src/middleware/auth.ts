import type { RequestHandler } from 'express';
import { and, eq, isNull, gt } from 'drizzle-orm';
import type { Permission, Role } from '@secureshelf/shared';
import { db } from '../db/client.js';
import { sessions, users } from '../db/schema/index.js';
import { COOKIE_ACCESS, verifyAccess } from '../lib/tokens.js';
import { hasPermission } from '../lib/permissions.js';
import { unauthorized, forbidden } from '../lib/errors.js';

export type AuthUser = { id: number; role: Role; email: string; fullName: string; sessionId: string };

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

// Proposal Figure 1, step 1. The JWT proves who signed in; the live session row proves the
// session has not been revoked since (FR-05). Suspended or offboarded accounts are rejected
// here even if their token has minutes left.
export const authenticate: RequestHandler = async (req, _res, next) => {
  const token = req.cookies?.[COOKIE_ACCESS] as string | undefined;
  const claims = token ? verifyAccess(token) : null;
  if (!claims) return next(unauthorized());

  const now = new Date();
  const [row] = await db
    .select({
      userId: users.id,
      role: users.role,
      email: users.email,
      fullName: users.fullName,
      status: users.status,
      sessionId: sessions.id,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, claims.sid), eq(sessions.userId, claims.sub), isNull(sessions.revokedAt), gt(sessions.expiresAt, now)))
    .limit(1);

  if (!row || row.status !== 'active') return next(unauthorized('Session is no longer valid'));

  req.user = { id: row.userId, role: row.role, email: row.email, fullName: row.fullName, sessionId: row.sessionId };
  next();
};

// Proposal Figure 1, step 2. Deny by default; the role must hold the permission.
export const requirePermission =
  (...permissions: Permission[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    const ok = permissions.some((p) => hasPermission(req.user!.role, p));
    if (!ok) return next(forbidden());
    next();
  };
