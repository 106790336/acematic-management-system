// 审计日志类型

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  description: string;
  oldData?: string;
  newData?: string;
  changedFields?: string;
  userId: string;
  userName: string;
  userRole: string;
  departmentId?: string;
  departmentName?: string;
  ipAddress?: string;
  userAgent?: string;
  requestPath?: string;
  requestMethod?: string;
  status: 'success' | 'failed';
  errorMessage?: string;
  businessType?: string;
  businessId?: string;
  createdAt: string;
}

export interface AuditLogFilters {
  action?: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface AuditLogStats {
  totalCount: number;
  todayCount: number;
  actionStats: { action: string; count: number }[];
  entityStats: { entityType: string; count: number }[];
  statusStats: { status: string; count: number }[];
  topUsers: { userId: string; userName: string; count: number }[];
}

// 操作类型选项
export const AUDIT_ACTION_OPTIONS = [
  { value: 'create', label: '创建' },
  { value: 'update', label: '更新' },
  { value: 'delete', label: '删除' },
  { value: 'view', label: '查看' },
  { value: 'submit', label: '提交' },
  { value: 'review', label: '审核' },
  { value: 'approve', label: '批准' },
  { value: 'reject', label: '驳回' },
  { value: 'withdraw', label: '撤回' },
  { value: 'cancel', label: '取消' },
  { value: 'complete', label: '完成' },
  { value: 'login', label: '登录' },
  { value: 'logout', label: '登出' },
  { value: 'export', label: '导出' },
  { value: 'import', label: '导入' },
] as const;

// 实体类型选项
export const AUDIT_ENTITY_OPTIONS = [
  { value: 'strategy', label: '战略' },
  { value: 'plan', label: '计划' },
  { value: 'task', label: '任务' },
  { value: 'user', label: '用户' },
  { value: 'department', label: '部门' },
  { value: 'meeting', label: '会议' },
  { value: 'issue', label: '问题' },
  { value: 'dailyLog', label: '日报' },
  { value: 'weeklyReport', label: '周报' },
  { value: 'assessment', label: '考核' },
  { value: 'changeRequest', label: '变更申请' },
  { value: 'workflow', label: '工作流' },
  { value: 'system', label: '系统' },
] as const;

// 获取操作类型标签
export function getAuditActionLabel(action: string): string {
  const option = AUDIT_ACTION_OPTIONS.find(opt => opt.value === action);
  return option?.label || action;
}

// 获取实体类型标签
export function getAuditEntityLabel(entityType: string): string {
  const option = AUDIT_ENTITY_OPTIONS.find(opt => opt.value === entityType);
  return option?.label || entityType;
}
