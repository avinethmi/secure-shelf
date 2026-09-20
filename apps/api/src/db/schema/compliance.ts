import { pgTable, serial, text, integer, timestamp, date, index } from 'drizzle-orm/pg-core';
import { classificationEnum, controlSourceEnum, assessmentStatusEnum } from './enums.js';
import { users } from './users.js';

// FR-12: asset register with owner, classification and the kinds of data it holds.
export const assets = pgTable('assets', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  ownerId: integer('owner_id').references(() => users.id, { onDelete: 'set null' }),
  classification: classificationEnum('classification').notNull().default('internal'),
  dataTypes: text('data_types').array().notNull().default([]),
  location: text('location'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Control library seeded from the proposal's §6 sources. Read-only through the API.
export const controls = pgTable('controls', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  source: controlSourceEnum('source').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
});

// FR-13: assessment of one control, optionally scoped to one asset.
export const controlAssessments = pgTable(
  'control_assessments',
  {
    id: serial('id').primaryKey(),
    controlId: integer('control_id')
      .notNull()
      .references(() => controls.id),
    assetId: integer('asset_id').references(() => assets.id, { onDelete: 'set null' }),
    status: assessmentStatusEnum('status').notNull().default('not_started'),
    ownerId: integer('owner_id').references(() => users.id, { onDelete: 'set null' }),
    targetDate: date('target_date'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('control_assessments_status_idx').on(t.status)],
);

// Evidence files: metadata only. Bytes live under STORAGE_DIR with a random name.
export const evidenceFiles = pgTable('evidence_files', {
  id: serial('id').primaryKey(),
  assessmentId: integer('assessment_id')
    .notNull()
    .references(() => controlAssessments.id, { onDelete: 'cascade' }),
  originalName: text('original_name').notNull(),
  storedName: text('stored_name').notNull().unique(),
  mime: text('mime').notNull(),
  size: integer('size').notNull(),
  sha256: text('sha256').notNull(),
  uploadedBy: integer('uploaded_by')
    .notNull()
    .references(() => users.id),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow(),
});
