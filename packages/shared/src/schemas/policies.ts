import { z } from 'zod';
import { CLASSIFICATIONS, POLICY_TYPES, ROLES } from '../enums';
import { optionalText } from './common';

// FR-06 to FR-09. Content is markdown; 50 kB is far beyond any policy a shop will write
// and keeps the JSON body limit meaningful.
const titleSchema = z.string().trim().min(3, 'Title must be at least 3 characters').max(160);
const contentSchema = z.string().trim().min(20, 'Write at least a short paragraph').max(50_000);

export const createPolicySchema = z.object({
  title: titleSchema,
  type: z.enum(POLICY_TYPES),
  classification: z.enum(CLASSIFICATIONS),
  content: contentSchema,
  changeNote: optionalText(300),
});
export type CreatePolicyInput = z.output<typeof createPolicySchema>;
export type CreatePolicyForm = z.input<typeof createPolicySchema>;

export const createVersionSchema = z.object({
  title: titleSchema,
  content: contentSchema,
  changeNote: optionalText(300),
});
export type CreateVersionInput = z.output<typeof createVersionSchema>;
export type CreateVersionForm = z.input<typeof createVersionSchema>;

export const updateVersionSchema = z.object({
  title: titleSchema.optional(),
  content: contentSchema.optional(),
  changeNote: optionalText(300),
});
export type UpdateVersionInput = z.output<typeof updateVersionSchema>;

// Review outcome notes: a change request must say what to change; approval may add a note.
export const requestChangesSchema = z.object({ note: z.string().trim().min(3, 'Say what needs to change').max(1000) });
export const approveSchema = z.object({ note: optionalText(1000) });
export type ReviewNoteInput = z.infer<typeof requestChangesSchema>;

export const publishSchema = z.object({
  roles: z
    .array(z.enum(ROLES))
    .min(1, 'Choose at least one role')
    .transform((r) => Array.from(new Set(r))),
});
export type PublishInput = z.output<typeof publishSchema>;
export type PublishForm = z.input<typeof publishSchema>;

export const versionIdParamSchema = z.object({ vid: z.coerce.number().int().positive() });
