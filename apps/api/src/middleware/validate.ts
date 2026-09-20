import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

type Schemas = { body?: ZodType; params?: ZodType; query?: ZodType };

// Proposal Figure 1, step 3 and NFR-03: structural validation before any service logic.
// Parsed (and therefore trimmed, coerced, defaulted) values replace the raw input so
// services only ever see data in the shape they were written for.
export const validate =
  (schemas: Schemas): RequestHandler =>
  (req, _res, next) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body ?? {});
      if (schemas.params) (req as { params: unknown }).params = schemas.params.parse(req.params);
      if (schemas.query) {
        // Express 5 exposes req.query as a getter; keep the parsed copy on a known field.
        req.validatedQuery = schemas.query.parse(req.query);
      }
      next();
    } catch (err) {
      next(err);
    }
  };

declare module 'express-serve-static-core' {
  interface Request {
    validatedQuery?: unknown;
  }
}
