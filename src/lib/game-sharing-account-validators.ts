import { z } from "zod";

export const SHARING_ACCOUNT_STATUSES = ["AVAILABLE", "IN_USE", "MAINTENANCE", "OFFLINE"] as const;
// Status set by staff; IN_USE is reserved for the allocation flow.
export const MANUAL_SHARING_ACCOUNT_STATUSES = ["AVAILABLE", "MAINTENANCE", "OFFLINE"] as const;

export const SHARING_AUDIT_ACTIONS = [
  "CREATED",
  "UPDATED",
  "STATUS_CHANGED",
  "ALLOCATED",
  "RELEASED",
  "ALLOCATION_CANCELLED",
] as const;

export const sharingAccountCodeSchema = z
  .string()
  .trim()
  .min(2)
  .max(50)
  .regex(/^[A-Za-z0-9]+(-[A-Za-z0-9]+)*$/, "Kode akun hanya boleh huruf, angka, dan tanda hubung");

const cuidSchema = z.string().trim().min(1).max(64);

export const sharingAccountCreateSchema = z.object({
  accountCode: sharingAccountCodeSchema,
  gameId: cuidSchema,
  status: z.enum(MANUAL_SHARING_ACCOUNT_STATUSES).optional().default("AVAILABLE"),
  secretRef: z.string().trim().max(255).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export const sharingAccountUpdateSchema = z
  .object({
    secretRef: z.string().trim().max(255).nullable().optional(),
    notes: z.string().trim().max(500).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const sharingAccountStatusSchema = z.object({
  accountId: cuidSchema,
  status: z.enum(MANUAL_SHARING_ACCOUNT_STATUSES),
  notes: z.string().trim().max(500).optional(),
});

export const allocateSharingAccountSchema = z.object({
  accountId: cuidSchema,
  sessionId: cuidSchema,
});

export const sharingAuditActionSchema = z.enum(SHARING_AUDIT_ACTIONS);

export const releaseAllocationSchema = z.object({ allocationId: cuidSchema });
export const auditLogFilterSchema = z.object({
  accountId: cuidSchema.optional(),
  allocationId: cuidSchema.optional(),
  action: sharingAuditActionSchema.optional(),
  performedByUserId: cuidSchema.optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const allocateAccountSchema = allocateSharingAccountSchema;
export const changeAccountStatusSchema = sharingAccountStatusSchema;
export const gameSharingAccountCreateSchema = sharingAccountCreateSchema;
export const gameSharingAccountUpdateSchema = sharingAccountUpdateSchema;

export type GameSharingAccountCreateInput = z.input<typeof sharingAccountCreateSchema>;
export type GameSharingAccountUpdateInput = z.input<typeof sharingAccountUpdateSchema>;
export type AllocateAccountInput = z.input<typeof allocateSharingAccountSchema>;
export type ReleaseAllocationInput = z.input<typeof releaseAllocationSchema>;
export type ChangeAccountStatusInput = z.input<typeof sharingAccountStatusSchema>;
export type AuditLogFilter = z.input<typeof auditLogFilterSchema>;

export type SharingAccountCreateInput = z.input<typeof sharingAccountCreateSchema>;
export type SharingAccountUpdateInput = z.input<typeof sharingAccountUpdateSchema>;
export type SharingAccountStatusInput = z.input<typeof sharingAccountStatusSchema>;
export type AllocateSharingAccountInput = z.input<typeof allocateSharingAccountSchema>;
export type SharingAuditAction = (typeof SHARING_AUDIT_ACTIONS)[number];
