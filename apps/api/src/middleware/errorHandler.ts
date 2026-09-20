import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';
import { isProduction } from '../config/env.js';

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: { code: 'not_found', message: 'Route not found' } });
};

// Never leaks stack traces or driver messages to the client. Unknown errors are logged
// server-side with a correlation id the client can quote back.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'validation',
        message: 'Request failed validation',
        details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
    });
    return;
  }
  if (err && typeof err === 'object' && 'type' in err && (err as { type: string }).type === 'entity.too.large') {
    res.status(413).json({ error: { code: 'payload_too_large', message: 'Request body too large' } });
    return;
  }
  if (err instanceof Error && err.message === 'Origin not allowed by CORS') {
    res.status(403).json({ error: { code: 'cors', message: err.message } });
    return;
  }
  // Database-enforced rules (triggers and unique constraints, migration 0001) are the last
  // line of defence; when one fires the client gets a conflict, not a stack trace.
  const pgCode = err && typeof err === 'object' && 'code' in err ? String((err as { code: unknown }).code) : '';
  if (pgCode === '23514' || pgCode === 'P0001') {
    res.status(409).json({ error: { code: 'conflict', message: 'The database rejected this change because the record is locked' } });
    return;
  }
  if (pgCode === '23505') {
    res.status(409).json({ error: { code: 'conflict', message: 'A record with the same value already exists' } });
    return;
  }

  const ref = Math.random().toString(36).slice(2, 10);
  console.error(`[${ref}] unhandled error:`, err);
  res.status(500).json({
    error: {
      code: 'internal',
      message: `Something went wrong (ref ${ref})`,
      ...(isProduction ? {} : { debug: err instanceof Error ? err.message : String(err) }),
    },
  });
};
