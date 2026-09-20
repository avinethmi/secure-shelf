import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { forbidden } from '../lib/errors.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Cookies are SameSite=Strict, which already blocks cross-site request forgery in every
// current browser. This is the belt to that braces: a state-changing request must come
// from an origin we serve (same host) or one on the CORS allowlist.
export const originCheck: RequestHandler = (req, _res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.get('origin') ?? (req.get('referer') ? new URL(req.get('referer')!).origin : undefined);
  if (!origin) {
    // Non-browser clients (curl, tests) send no Origin. They cannot carry a victim's
    // cookies either, so this is safe to allow.
    return next();
  }

  const self = `${req.protocol}://${req.get('host')}`;
  if (origin === self || env.CORS_ORIGINS.includes(origin)) return next();

  return next(forbidden('Request origin not allowed'));
};
