import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import type { Response, Request } from 'express';
import type { Role } from '@secureshelf/shared';
import { env, isProduction } from '../config/env.js';

// NFR-02: access tokens live 15 minutes, refresh tokens 7 days. Both travel as httpOnly
// SameSite=Strict cookies so scripts never see them. A short "pre-auth" token bridges the
// password step and the TOTP step for Owner / Security Admin logins (FR-03).

export const ACCESS_TTL_SEC = 15 * 60;
export const REFRESH_TTL_SEC = 7 * 24 * 60 * 60;
export const PREAUTH_TTL_SEC = 5 * 60;

export const COOKIE_ACCESS = 'ss_access';
export const COOKIE_REFRESH = 'ss_refresh';
export const COOKIE_PREAUTH = 'ss_preauth';

export type AccessClaims = { sub: number; sid: string; role: Role; typ: 'access' };
export type RefreshClaims = { sub: number; sid: string; typ: 'refresh' };
export type PreauthClaims = { sub: number; typ: 'preauth'; purpose: 'totp_verify' | 'totp_enrol' };

const baseCookie = {
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: isProduction,
  path: '/',
};

// Every token carries a random jti. Without it, two tokens signed in the same second with the
// same claims are byte-identical, and refresh rotation would silently re-issue the old token.
const jti = () => crypto.randomBytes(12).toString('base64url');

export function signAccess(claims: Omit<AccessClaims, 'typ'>) {
  return jwt.sign({ ...claims, typ: 'access' }, env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_TTL_SEC, issuer: 'secureshelf', jwtid: jti() });
}
export function signRefresh(claims: Omit<RefreshClaims, 'typ'>) {
  return jwt.sign({ ...claims, typ: 'refresh' }, env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_TTL_SEC, issuer: 'secureshelf', jwtid: jti() });
}
export function signPreauth(claims: Omit<PreauthClaims, 'typ'>) {
  return jwt.sign({ ...claims, typ: 'preauth' }, env.JWT_ACCESS_SECRET, { expiresIn: PREAUTH_TTL_SEC, issuer: 'secureshelf', jwtid: jti() });
}

function verify<T extends { typ: string }>(token: string, secret: string, typ: T['typ']): T | null {
  try {
    const decoded = jwt.verify(token, secret, { issuer: 'secureshelf' }) as T;
    return decoded.typ === typ ? decoded : null;
  } catch {
    return null;
  }
}
export const verifyAccess = (t: string) => verify<AccessClaims>(t, env.JWT_ACCESS_SECRET, 'access');
export const verifyRefresh = (t: string) => verify<RefreshClaims>(t, env.JWT_REFRESH_SECRET, 'refresh');
export const verifyPreauth = (t: string) => verify<PreauthClaims>(t, env.JWT_ACCESS_SECRET, 'preauth');

export function setSessionCookies(res: Response, access: string, refresh: string) {
  res.cookie(COOKIE_ACCESS, access, { ...baseCookie, maxAge: ACCESS_TTL_SEC * 1000 });
  // Refresh cookie is scoped to the refresh route so it is not sent with every request.
  res.cookie(COOKIE_REFRESH, refresh, { ...baseCookie, path: '/api/auth/refresh', maxAge: REFRESH_TTL_SEC * 1000 });
}
export function setPreauthCookie(res: Response, token: string) {
  res.cookie(COOKIE_PREAUTH, token, { ...baseCookie, path: '/api/auth', maxAge: PREAUTH_TTL_SEC * 1000 });
}
export function clearSessionCookies(res: Response) {
  res.clearCookie(COOKIE_ACCESS, { ...baseCookie });
  res.clearCookie(COOKIE_REFRESH, { ...baseCookie, path: '/api/auth/refresh' });
  res.clearCookie(COOKIE_PREAUTH, { ...baseCookie, path: '/api/auth' });
}

export const clientIp = (req: Request) => req.ip ?? req.socket.remoteAddress ?? null;
