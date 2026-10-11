// DRAFT — Game Sharing Account Management Types
// Not active; existing schema unchanged.

export type SharingAccountStatus = 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'OFFLINE';

export type SharingAccountAllocationStatus = 'ACTIVE' | 'RELEASED';

// Approved, explicit audit actions. Must stay in sync with the SQL draft CHECK
// constraint and RENTAL_SCHEMA_PROPOSAL.md. Do not add actions without owner approval.
export type SharingAccountAuditAction =
  | 'CREATED'
  | 'UPDATED'
  | 'STATUS_CHANGED'
  | 'ALLOCATED'
  | 'RELEASED'
  | 'ALLOCATION_CANCELLED';

export type GameSharingAccount = {
  id: string;
  accountCode: string;
  gameId: string;
  status: SharingAccountStatus;
  secretRef: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type GameSharingAccountAllocation = {
  id: string;
  accountId: string;
  sessionId: string;
  status: SharingAccountAllocationStatus;
  allocatedAt: Date;
  releasedAt: Date | null;
};

export type GameSharingAccountAuditLog = {
  id: string;
  accountId: string;
  accountCodeSnapshot: string;
  gameIdSnapshot: string;
  allocationId: string | null;
  action: SharingAccountAuditAction;
  previousStatus: string | null;
  newStatus: string | null;
  performedByUserId: string;
  details: string | null;
  createdAt: Date;
};

export type GameSharingAccountCreateInput = {
  accountCode: string;
  gameId: string;
  status?: SharingAccountStatus;
  secretRef?: string | null;
  notes?: string | null;
};

export type GameSharingAccountUpdateInput = Partial<
  Pick<GameSharingAccount, 'notes' | 'secretRef'>
> & {
  status?: SharingAccountStatus;
  isActive?: boolean;
};

export type AllocateAccountInput = {
  accountId: string;
  sessionId: string;
};

export type ReleaseAllocationInput = {
  allocationId: string;
};

export type ChangeAccountStatusInput = {
  accountId: string;
  status: SharingAccountStatus;
  notes?: string;
};

export type AuditLogFilter = {
  accountId?: string;
  allocationId?: string;
  startDate?: Date;
  endDate?: Date;
  action?: string;
  performedByUserId?: string;
};
// No rental pricing, duration, or extension fields.
