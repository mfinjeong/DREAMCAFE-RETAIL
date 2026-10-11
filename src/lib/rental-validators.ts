// DRAFT — Validators for Game Sharing Account Management
// Not active; existing schema unchanged.
// Prisma schema draft uses 'GameSharingAccount', 'GameSharingAccountAllocation', etc.

import { z } from 'zod';

const auditActionEnum = z.enum([
  'CREATED',
  'UPDATED',
  'STATUS_CHANGED',
  'ALLOCATED',
  'RELEASED',
  'ALLOCATION_CANCELLED',
]);

export const accountCodeSchema = z
  .string()
  .min(2)
  .max(50)
  .regex(/^[A-Za-z0-9]+(-[A-Za-z0-9]+)*$/, {
    message: 'Account code must be alphanumeric with optional hyphens',
  });

export const gameSharingAccountCreateSchema = z.object({
  accountCode: accountCodeSchema,
  gameId: z.string().cuid(),
  status: z.enum(['AVAILABLE', 'MAINTENANCE', 'OFFLINE']).optional().default('AVAILABLE'),
  secretRef: z.string().max(200).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const gameSharingAccountUpdateSchema = z.object({
  status: z.enum(['AVAILABLE', 'MAINTENANCE', 'OFFLINE']).optional(),
  secretRef: z.string().max(200).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const allocateAccountSchema = z.object({
  accountId: z.string().cuid(),
  sessionId: z.string().cuid(),
});

export const releaseAllocationSchema = z.object({
  allocationId: z.string().cuid(),
});

export const changeAccountStatusSchema = z.object({
  accountId: z.string().cuid(),
  status: z.enum(['AVAILABLE', 'MAINTENANCE', 'OFFLINE']),
  notes: z.string().max(500).optional(),
});

export const auditLogFilterSchema = z.object({
  accountId: z.string().cuid().optional(),
  allocationId: z.string().cuid().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  action: auditActionEnum.optional(),
  performedByUserId: z.string().cuid().optional(),
});
// No pricing, duration, or extension validators: sharing accounts use no separate rate.
