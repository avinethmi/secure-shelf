import { pgTable, serial, text, integer, timestamp, primaryKey, unique, index } from 'drizzle-orm/pg-core';
import { policyTypeEnum, classificationEnum, policyVersionStatusEnum, roleEnum } from './enums.js';
import { users } from './users.js';

// FR-06: a policy is the stable identity (code, title, type, classification).
export const policies = pgTable('policies', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  title: text('title').notNull(),
  type: policyTypeEnum('type').notNull(),
  classification: classificationEnum('classification').notNull().default('internal'),
  createdBy: integer('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// FR-07, FR-08: every change is a numbered version with its own lifecycle. A migration adds
// a trigger so a published version's title/content can never be updated (immutability is
// enforced by the database, not only by the service).
export const policyVersions = pgTable(
  'policy_versions',
  {
    id: serial('id').primaryKey(),
    policyId: integer('policy_id')
      .notNull()
      .references(() => policies.id, { onDelete: 'cascade' }),
    versionNo: integer('version_no').notNull(),
    title: text('title').notNull(),
    content: text('content').notNull(),
    changeNote: text('change_note'),
    status: policyVersionStatusEnum('status').notNull().default('draft'),
    authorId: integer('author_id')
      .notNull()
      .references(() => users.id),
    approverId: integer('approver_id').references(() => users.id),
    reviewNote: text('review_note'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('policy_versions_policy_version_uq').on(t.policyId, t.versionNo), index('policy_versions_status_idx').on(t.status)],
);

// FR-09: which roles must acknowledge a published version.
export const policyVersionRoles = pgTable(
  'policy_version_roles',
  {
    versionId: integer('version_id')
      .notNull()
      .references(() => policyVersions.id, { onDelete: 'cascade' }),
    role: roleEnum('role').notNull(),
  },
  (t) => [primaryKey({ columns: [t.versionId, t.role] })],
);

// FR-09: user, version, time. Unique per user and version, so it is idempotent.
export const policyAcknowledgements = pgTable(
  'policy_acknowledgements',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    versionId: integer('version_id')
      .notNull()
      .references(() => policyVersions.id, { onDelete: 'cascade' }),
    acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('policy_ack_user_version_uq').on(t.userId, t.versionId)],
);
