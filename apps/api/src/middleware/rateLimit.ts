import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';
import { isTest } from '../config/env.js';

const json429 = (message: string) => ({ error: { code: 'rate_limited', message } });

// Source address. Under NODE_ENV=test only, an X-Test-IP header may stand in for the real
// address so the suite can isolate limiter buckets per test; it is ignored otherwise.
const sourceIp = (req: Request) => ipKeyGenerator((isTest && req.get('x-test-ip')) || req.ip || '');

// NFR-04: at most 10 login attempts per source address per minute.
export const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: sourceIp,
  message: json429('Too many login attempts from this address. Wait a minute and try again.'),
});

// TOTP codes are 6 digits; without a limit they could be brute forced inside a window.
export const totpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 15,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: sourceIp,
  message: json429('Too many code attempts. Wait a few minutes and try again.'),
});

// General ceiling for everything else; generous for a small shop, still stops a runaway client.
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: sourceIp,
  message: json429('Too many requests. Slow down and try again.'),
});
