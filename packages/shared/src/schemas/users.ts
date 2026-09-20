import { z } from 'zod';
import { ROLES, USER_STATUSES } from '../enums';
import { passwordSchema } from './auth';

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v === '' ? undefined : v));

export const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  fullName: z.string().trim().min(2).max(120),
  role: z.enum(ROLES),
  password: passwordSchema,
  jobTitle: optionalText(80),
  nic: optionalText(20),
  phone: optionalText(20),
  contact: optionalText(200),
});
export type CreateUserInput = z.output<typeof createUserSchema>;
export type CreateUserForm = z.input<typeof createUserSchema>;

export const updateUserSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  jobTitle: optionalText(80),
  nic: optionalText(20),
  phone: optionalText(20),
  contact: optionalText(200),
});
export type UpdateUserInput = z.output<typeof updateUserSchema>;
export type UpdateUserForm = z.input<typeof updateUserSchema>;

export const setUserStatusSchema = z.object({
  status: z.enum(USER_STATUSES),
  reason: optionalText(300),
});
export type SetUserStatusInput = z.infer<typeof setUserStatusSchema>;

export const idParamSchema = z.object({ id: z.coerce.number().int().positive() });
