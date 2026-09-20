import { pgTable, serial, text, integer, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { roleEnum, userStatusEnum } from './enums.js';

// FR-01, FR-02, FR-04, FR-05, NFR-05. One role per user. The *_enc columns hold
// AES-256-GCM ciphertext (iv.tag.ciphertext, base64) and are decrypted only for
// users.manage callers.
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    role: roleEnum('role').notNull(),
    status: userStatusEnum('status').notNull().default('active'),
    fullName: text('full_name').notNull(),
    jobTitle: text('job_title'),
    nicEnc: text('nic_enc'),
    phoneEnc: text('phone_enc'),
    contactEnc: text('contact_enc'),
    failedAttempts: integer('failed_attempts').notNull().default(0),
    lockedAt: timestamp('locked_at', { withTimezone: true }),
    totpSecretEnc: text('totp_secret_enc'),
    totpEnabled: boolean('totp_enabled').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('users_role_idx').on(t.role), index('users_status_idx').on(t.status)],
);

// NFR-02 / FR-05. One row per login. The refresh token itself is never stored, only its
// SHA-256; deleting the row kills the session immediately because `authenticate` checks it.
export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    refreshHash: text('refresh_hash').notNull(),
    ip: text('ip'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (t) => [index('sessions_user_idx').on(t.userId)],
);
