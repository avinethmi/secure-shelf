import { pgTable, serial, text, integer, timestamp, boolean, jsonb, primaryKey, unique, index } from 'drizzle-orm/pg-core';
import { roleEnum, courseStatusEnum } from './enums.js';
import { users } from './users.js';

// FR-10: a course is a short set of lessons plus a quiz pool with a pass mark and attempt limit.
export const courses = pgTable('courses', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  title: text('title').notNull(),
  topic: text('topic').notNull(),
  description: text('description').notNull(),
  passMark: integer('pass_mark').notNull().default(80),
  maxAttempts: integer('max_attempts').notNull().default(3),
  questionsPerAttempt: integer('questions_per_attempt').notNull().default(5),
  dueDays: integer('due_days').notNull().default(14),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const lessons = pgTable(
  'lessons',
  {
    id: serial('id').primaryKey(),
    courseId: integer('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    orderNo: integer('order_no').notNull(),
    title: text('title').notNull(),
    content: text('content').notNull(),
  },
  (t) => [unique('lessons_course_order_uq').on(t.courseId, t.orderNo)],
);

// Pool of 8 to 10 per course; 5 are drawn per attempt. `explanation` teaches the right answer.
export const quizQuestions = pgTable(
  'quiz_questions',
  {
    id: serial('id').primaryKey(),
    courseId: integer('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    lessonId: integer('lesson_id').references(() => lessons.id, { onDelete: 'set null' }),
    prompt: text('prompt').notNull(),
    options: jsonb('options').$type<string[]>().notNull(),
    correctIndex: integer('correct_index').notNull(),
    explanation: text('explanation').notNull(),
  },
  (t) => [index('quiz_questions_course_idx').on(t.courseId)],
);

// §5.2: required training per role.
export const courseRoles = pgTable(
  'course_roles',
  {
    courseId: integer('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    role: roleEnum('role').notNull(),
  },
  (t) => [primaryKey({ columns: [t.courseId, t.role] })],
);

// The draw is stored when the attempt starts and grading uses only the stored draw, so the
// client can neither pick questions nor see the key.
export const quizAttempts = pgTable(
  'quiz_attempts',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    courseId: integer('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    attemptNo: integer('attempt_no').notNull(),
    questionIds: jsonb('question_ids').$type<number[]>().notNull(),
    optionOrders: jsonb('option_orders').$type<Record<string, number[]>>().notNull(),
    answers: jsonb('answers').$type<Record<string, number>>(),
    score: integer('score'),
    passed: boolean('passed'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
  },
  (t) => [index('quiz_attempts_user_course_idx').on(t.userId, t.courseId)],
);

// FR-11: one row per user per required course.
export const courseProgress = pgTable(
  'course_progress',
  {
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    courseId: integer('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    status: courseStatusEnum('status').notNull().default('assigned'),
    lessonsDone: jsonb('lessons_done').$type<number[]>().notNull().default([]),
    attemptsUsed: integer('attempts_used').notNull().default(0),
    bestScore: integer('best_score'),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
    dueAt: timestamp('due_at', { withTimezone: true }).notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.courseId] })],
);
