import { pgTable, bigserial, text, integer, timestamp, jsonb, char, index } from 'drizzle-orm/pg-core';
import { roleEnum } from './enums.js';

// FR-19 and proposal §5.3. Append-only: a migration adds a BEFORE UPDATE OR DELETE trigger
// that raises, and the app role has no UPDATE/DELETE privilege on this table. Each row
// carries the previous row's hash, so any edit or deletion breaks the chain that
// GET /api/audit/verify recomputes.
export const auditEvents = pgTable(
  'audit_events',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
    actorId: integer('actor_id'),
    actorRole: roleEnum('actor_role'),
    action: text('action').notNull(),
    entity: text('entity').notNull(),
    entityId: text('entity_id'),
    details: jsonb('details').$type<Record<string, unknown>>().notNull().default({}),
    ip: text('ip'),
    prevHash: char('prev_hash', { length: 64 }).notNull(),
    hash: char('hash', { length: 64 }).notNull(),
  },
  (t) => [index('audit_events_actor_idx').on(t.actorId), index('audit_events_entity_idx').on(t.entity, t.entityId), index('audit_events_at_idx').on(t.at)],
);
