import { pgTable, serial, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { incidentCategoryEnum, incidentSeverityEnum, incidentStatusEnum } from './enums.js';
import { users } from './users.js';

// FR-18: anyone reports; authorised roles move the status. `ref` is the human id (INC-0001).
export const incidents = pgTable(
  'incidents',
  {
    id: serial('id').primaryKey(),
    ref: text('ref').notNull().unique(),
    reportedBy: integer('reported_by')
      .notNull()
      .references(() => users.id),
    category: incidentCategoryEnum('category').notNull(),
    severity: incidentSeverityEnum('severity').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    location: text('location'),
    status: incidentStatusEnum('status').notNull().default('new'),
    assignedTo: integer('assigned_to').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('incidents_status_idx').on(t.status)],
);

export const incidentStatusHistory = pgTable('incident_status_history', {
  id: serial('id').primaryKey(),
  incidentId: integer('incident_id')
    .notNull()
    .references(() => incidents.id, { onDelete: 'cascade' }),
  fromStatus: incidentStatusEnum('from_status'),
  toStatus: incidentStatusEnum('to_status').notNull(),
  changedBy: integer('changed_by')
    .notNull()
    .references(() => users.id),
  note: text('note'),
  changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),
});
