import { pgTable, serial, text, integer, timestamp, boolean, primaryKey, index } from 'drizzle-orm/pg-core';
import { cctvAccessKindEnum } from './enums.js';
import { users } from './users.js';

// FR-15: camera register. `purpose` is the PDPA purpose statement; retention and signage are
// the governance facts a DPIA would ask for. Note the PCI point: purpose text should state
// that PIN entry is not in frame.
export const cameras = pgTable('cameras', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  location: text('location').notNull(),
  purpose: text('purpose').notNull(),
  retentionDays: integer('retention_days').notNull().default(30),
  signagePresent: boolean('signage_present').notNull().default(true),
  active: boolean('active').notNull().default(true),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// FR-15: named viewing authorisations.
export const cameraAuthorisations = pgTable(
  'camera_authorisations',
  {
    id: serial('id').primaryKey(),
    cameraId: integer('camera_id')
      .notNull()
      .references(() => cameras.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    grantedBy: integer('granted_by')
      .notNull()
      .references(() => users.id),
    reason: text('reason'),
    grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (t) => [index('camera_auth_user_idx').on(t.userId)],
);

// FR-16: a manual governance declaration. It is not an automatic record from the CCTV
// equipment and the UI says so.
export const cctvAccessDeclarations = pgTable('cctv_access_declarations', {
  id: serial('id').primaryKey(),
  cameraId: integer('camera_id')
    .notNull()
    .references(() => cameras.id),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  kind: cctvAccessKindEnum('kind').notNull(),
  reason: text('reason').notNull(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
  declaredAt: timestamp('declared_at', { withTimezone: true }).notNull().defaultNow(),
});

// FR-17: the monitoring notice is versioned like a policy; staff acknowledge the current one.
export const monitoringNotices = pgTable('monitoring_notices', {
  id: serial('id').primaryKey(),
  versionNo: integer('version_no').notNull().unique(),
  content: text('content').notNull(),
  publishedBy: integer('published_by')
    .notNull()
    .references(() => users.id),
  publishedAt: timestamp('published_at', { withTimezone: true }).notNull().defaultNow(),
});

export const monitoringNoticeAcks = pgTable(
  'monitoring_notice_acks',
  {
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    noticeId: integer('notice_id')
      .notNull()
      .references(() => monitoringNotices.id, { onDelete: 'cascade' }),
    acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.noticeId] })],
);
