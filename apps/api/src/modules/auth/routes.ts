import { Router } from 'express';
import { loginSchema, totpCodeSchema } from '@secureshelf/shared';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { loginLimiter, totpLimiter } from '../../middleware/rateLimit.js';
import { unauthorized } from '../../lib/errors.js';
import {
  COOKIE_PREAUTH,
  COOKIE_REFRESH,
  clearSessionCookies,
  clientIp,
  setPreauthCookie,
  setSessionCookies,
  signPreauth,
  verifyPreauth,
} from '../../lib/tokens.js';
import * as svc from './service.js';

export const authRouter = Router();

const meta = (req: Parameters<typeof clientIp>[0]) => ({ ip: clientIp(req), userAgent: req.get('user-agent') ?? null });

// FR-01, FR-02, NFR-04. Returns either a session or a "second factor needed" marker.
authRouter.post('/login', loginLimiter, validate({ body: loginSchema }), async (req, res, next) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const out = await svc.login(email, password, meta(req));
    if (out.kind === 'session') {
      setSessionCookies(res, out.access, out.refresh);
      res.json({ status: 'authenticated', user: out.user });
      return;
    }
    setPreauthCookie(res, signPreauth({ sub: out.userId, purpose: out.enrolled ? 'totp_verify' : 'totp_enrol' }));
    res.json({ status: out.enrolled ? 'totp_required' : 'totp_enrolment_required' });
  } catch (e) {
    next(e);
  }
});

function preauth(req: Parameters<typeof clientIp>[0], purpose: 'totp_verify' | 'totp_enrol') {
  const token = req.cookies?.[COOKIE_PREAUTH] as string | undefined;
  const claims = token ? verifyPreauth(token) : null;
  if (!claims || claims.purpose !== purpose) throw unauthorized('Start by signing in with your password');
  return claims.sub;
}

// FR-03: first-login enrolment for Owner / Security Admin.
authRouter.post('/totp/enrol', totpLimiter, async (req, res, next) => {
  try {
    const userId = preauth(req, 'totp_enrol');
    res.json(await svc.beginTotpEnrolment(userId));
  } catch (e) {
    next(e);
  }
});

authRouter.post('/totp/confirm', totpLimiter, validate({ body: totpCodeSchema }), async (req, res, next) => {
  try {
    const userId = preauth(req, 'totp_enrol');
    const out = await svc.confirmTotpEnrolment(userId, (req.body as { code: string }).code, meta(req));
    if (out.kind !== 'session') throw unauthorized();
    clearSessionCookies(res);
    setSessionCookies(res, out.access, out.refresh);
    res.json({ status: 'authenticated', user: out.user });
  } catch (e) {
    next(e);
  }
});

authRouter.post('/totp/verify', totpLimiter, validate({ body: totpCodeSchema }), async (req, res, next) => {
  try {
    const userId = preauth(req, 'totp_verify');
    const out = await svc.verifyTotpLogin(userId, (req.body as { code: string }).code, meta(req));
    if (out.kind !== 'session') throw unauthorized();
    clearSessionCookies(res);
    setSessionCookies(res, out.access, out.refresh);
    res.json({ status: 'authenticated', user: out.user });
  } catch (e) {
    next(e);
  }
});

// NFR-02: rotate the refresh token, mint a new access token.
authRouter.post('/refresh', async (req, res, next) => {
  try {
    const token = req.cookies?.[COOKIE_REFRESH] as string | undefined;
    if (!token) throw unauthorized('Session expired');
    const out = await svc.refresh(token, meta(req));
    setSessionCookies(res, out.access, out.refresh);
    res.json({ status: 'authenticated', user: out.user });
  } catch (e) {
    clearSessionCookies(res);
    next(e);
  }
});

authRouter.post('/logout', authenticate, async (req, res, next) => {
  try {
    await svc.logout(req.user!.sessionId, { id: req.user!.id, role: req.user!.role }, meta(req));
    clearSessionCookies(res);
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

authRouter.get('/me', authenticate, async (req, res, next) => {
  try {
    res.json({ user: await svc.me(req.user!.id) });
  } catch (e) {
    next(e);
  }
});
