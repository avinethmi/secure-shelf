import { Router } from 'express';
import { z } from 'zod';
import { and, desc, eq, gte, lte, ilike, type SQL } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { auditEvents, users } from '../../db/schema/index.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { verifyChain } from '../../lib/audit.js';

export const auditRouter = Router();
auditRouter.use(authenticate, requirePermission('audit.read'));

const listQuery = z.object({
  actorId: z.coerce.number().int().positive().optional(),
  action: z.string().trim().max(80).optional(),
  entity: z.string().trim().max(40).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  before: z.coerce.number().int().positive().optional(),
});

// FR-19: filtered, newest first, keyset paginated on id.
auditRouter.get('/', validate({ query: listQuery }), async (req, res, next) => {
  try {
    const q = req.validatedQuery as z.infer<typeof listQuery>;
    const where: SQL[] = [];
    if (q.actorId) where.push(eq(auditEvents.actorId, q.actorId));
    if (q.action) where.push(ilike(auditEvents.action, `${q.action}%`));
    if (q.entity) where.push(eq(auditEvents.entity, q.entity));
    if (q.from) where.push(gte(auditEvents.at, q.from));
    if (q.to) where.push(lte(auditEvents.at, q.to));
    if (q.before) where.push(lte(auditEvents.id, q.before - 1));

    const rows = await db
      .select({
        id: auditEvents.id,
        at: auditEvents.at,
        actorId: auditEvents.actorId,
        actorRole: auditEvents.actorRole,
        actorName: users.fullName,
        action: auditEvents.action,
        entity: auditEvents.entity,
        entityId: auditEvents.entityId,
        details: auditEvents.details,
        ip: auditEvents.ip,
        hash: auditEvents.hash,
      })
      .from(auditEvents)
      .leftJoin(users, eq(users.id, auditEvents.actorId))
      .where(where.length ? and(...where) : undefined)
      .orderBy(desc(auditEvents.id))
      .limit(q.limit + 1);

    const hasMore = rows.length > q.limit;
    res.json({ events: rows.slice(0, q.limit), nextBefore: hasMore ? rows[q.limit - 1]!.id : null });
  } catch (e) {
    next(e);
  }
});

// Proposal §5.3: integrity result.
auditRouter.get('/verify', async (_req, res, next) => {
  try {
    res.json(await verifyChain());
  } catch (e) {
    next(e);
  }
});
