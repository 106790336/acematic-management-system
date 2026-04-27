export interface SystemVersion {
  id: string;
  version: string;
  name: string;
  status: 'active' | 'rolled_back' | 'deprecated';
  deployedById: string | null;
  deployedAt: string;
  rolledBackAt: string | null;
  rolledBackById: string | null;
  rollbackReason: string | null;
  dbSnapshot: string | null;
  codeSnapshot: string | null;
  changes: string | null;
  createdAt: string;
  updatedAt: string;
  deployedBy?: {
    id: string;
    name: string;
    username: string;
  } | null;
  rolledBackBy?: {
    id: string;
    name: string;
    username: string;
  } | null;
}

export interface CreateVersionRequest {
  version: string;
  name: string;
  changes?: string[];
}

export interface RollbackRequest {
  reason: string;
}

export const VERSION_STATUS_MAP: Record<string, { label: string; color: string }> = {
  active: { label: '当前版本', color: 'green' },
  rolled_back: { label: '已回滚', color: 'red' },
  deprecated: { label: '已废弃', color: 'gray' }
};
