import { z } from 'zod';

// Optional free-text field: trimmed, capped, and an empty string becomes "not provided".
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v === '' ? undefined : v));

export const idParamSchema = z.object({ id: z.coerce.number().int().positive() });
