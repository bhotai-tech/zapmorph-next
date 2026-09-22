import { z } from 'zod';
import { PLAN_IDS } from '@/lib/plans';

/** Shared zod schemas — validate at every boundary. */

export const emailSchema = z.string().trim().toLowerCase().email().max(254);

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128);

export const signupSchema = z.object({
  fullName: z.string().trim().min(1, 'Name is required').max(120),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const planIdSchema = z.enum(PLAN_IDS);

export const checkoutSchema = z.object({
  planId: planIdSchema,
});

export const uuidSchema = z.uuid();

export const usageConsumeSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{3,60}$/),
  files: z.number().int().min(1).max(500),
  totalBytes: z.number().int().min(0).max(1e12),
  largestBytes: z.number().int().min(0).max(1e12),
});

export const profileUpdateSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
});
