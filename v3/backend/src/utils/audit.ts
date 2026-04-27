import { Request } from 'express';
import { prisma } from '../config/database';

// 操作类型常量
export const AuditAction = {
  // CRUD 操作
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  VIEW: 'view',
  
  // 业务流程操作
  SUBMIT: 'submit',
  REVIEW: 'review',
  APPROVE: 'approve',
  REJECT: 'reject',
  WITHDRAW: 'withdraw',
  CANCEL: 'cancel',
  COMPLETE: 'complete',
  
  // 任务相关
  ASSIGN: 'assign',
  ACCEPT: 'accept',
  START: 'start',
  PAUSE: 'pause',
  RESUME: 'resume',
  
  // 用户认证
  LOGIN: 'login',
  LOGOUT: 'logout',
  PASSWORD_CHANGE: 'password_change',
  
  // 系统操作
  EXPORT: 'export',
  IMPORT: 'import',
  BACKUP: 'backup',
  RESTORE: 'restore',
  SETTINGS_UPDATE: 'settings_update',
  
  // 权限操作
  PERMISSION_GRANT: 'permission_grant',
  PERMISSION_REVOKE: 'permission_revoke',
  ROLE_ASSIGN: 'role_assign',
} as const;

// 实体类型常量
export const AuditEntityType = {
  STRATEGY: 'strategy',
  PLAN: 'plan',
  TASK: 'task',
  USER: 'user',
  DEPARTMENT: 'department',
  MEETING: 'meeting',
  ISSUE: 'issue',
  DAILY_LOG: 'dailyLog',
  WEEKLY_REPORT: 'weeklyReport',
  ASSESSMENT: 'assessment',
  CHANGE_REQUEST: 'changeRequest',
  WORKFLOW: 'workflow',
  SYSTEM: 'system',
} as const;

// 审计日志配置选项
interface AuditLogOptions {
  action: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  description: string;
  oldData?: any;
  newData?: any;
  changedFields?: string[];
  status?: 'success' | 'failed';
  errorMessage?: string;
  businessType?: string;
  businessId?: string;
}

/**
 * 创建审计日志
 * @param req Express请求对象（用于获取用户信息和请求上下文）
 * @param options 审计日志选项
 */
export async function createAuditLog(
  req: Request,
  options: AuditLogOptions
): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      console.warn('Audit log skipped: no user in request');
      return;
    }

    // 获取用户详细信息
    const userDetail = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        department: {
          select: { id: true, name: true },
        },
      },
    });

    // 提取变更字段
    let changedFields: string[] | undefined = options.changedFields;
    if (!changedFields && options.oldData && options.newData) {
      changedFields = extractChangedFields(options.oldData, options.newData);
    }

    await prisma.auditLog.create({
      data: {
        action: options.action,
        entityType: options.entityType,
        entityId: options.entityId,
        entityName: options.entityName,
        description: options.description,
        oldData: options.oldData ? JSON.stringify(options.oldData) : null,
        newData: options.newData ? JSON.stringify(options.newData) : null,
        changedFields: changedFields ? JSON.stringify(changedFields) : null,
        userId: user.id,
        userName: userDetail?.name || user.username,
        userRole: user.role,
        departmentId: userDetail?.department?.id || user.departmentId,
        departmentName: userDetail?.department?.name,
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'] || null,
        requestPath: req.path,
        requestMethod: req.method,
        status: options.status || 'success',
        errorMessage: options.errorMessage,
        businessType: options.businessType,
        businessId: options.businessId,
      },
    });
  } catch (error) {
    // 审计日志记录失败不应影响主业务流程
    console.error('Failed to create audit log:', error);
  }
}

/**
 * 提取变更的字段列表
 */
function extractChangedFields(oldData: any, newData: any): string[] {
  const changed: string[] = [];
  const allKeys = new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]);
  
  for (const key of allKeys) {
    const oldValue = oldData?.[key];
    const newValue = newData?.[key];
    
    // 跳过内部字段
    if (key.startsWith('_') || key === 'createdAt' || key === 'updatedAt') {
      continue;
    }
    
    // 比较值（处理日期对象）
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changed.push(key);
    }
  }
  
  return changed;
}

/**
 * 获取客户端IP地址
 */
function getClientIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || null;
}

/**
 * 便捷函数：记录创建操作
 */
export async function auditCreate(
  req: Request,
  entityType: string,
  entityId: string,
  entityName: string,
  data: any,
  description?: string
): Promise<void> {
  await createAuditLog(req, {
    action: AuditAction.CREATE,
    entityType,
    entityId,
    entityName,
    description: description || `创建${getEntityTypeLabel(entityType)}: ${entityName}`,
    newData: data,
  });
}

/**
 * 便捷函数：记录更新操作
 */
export async function auditUpdate(
  req: Request,
  entityType: string,
  entityId: string,
  entityName: string,
  oldData: any,
  newData: any,
  description?: string
): Promise<void> {
  const changedFields = extractChangedFields(oldData, newData);
  await createAuditLog(req, {
    action: AuditAction.UPDATE,
    entityType,
    entityId,
    entityName,
    description: description || `更新${getEntityTypeLabel(entityType)}: ${entityName}`,
    oldData,
    newData,
    changedFields,
  });
}

/**
 * 便捷函数：记录删除操作
 */
export async function auditDelete(
  req: Request,
  entityType: string,
  entityId: string,
  entityName: string,
  oldData: any,
  description?: string
): Promise<void> {
  await createAuditLog(req, {
    action: AuditAction.DELETE,
    entityType,
    entityId,
    entityName,
    description: description || `删除${getEntityTypeLabel(entityType)}: ${entityName}`,
    oldData,
  });
}

/**
 * 便捷函数：记录状态变更
 */
export async function auditStatusChange(
  req: Request,
  entityType: string,
  entityId: string,
  entityName: string,
  oldStatus: string,
  newStatus: string,
  description?: string
): Promise<void> {
  await createAuditLog(req, {
    action: AuditAction.UPDATE,
    entityType,
    entityId,
    entityName,
    description: description || `${getEntityTypeLabel(entityType)}状态变更: ${oldStatus} → ${newStatus}`,
    oldData: { status: oldStatus },
    newData: { status: newStatus },
    changedFields: ['status'],
  });
}

/**
 * 便捷函数：记录登录
 */
export async function auditLogin(
  req: Request,
  userId: string,
  userName: string,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  await createAuditLog(req, {
    action: AuditAction.LOGIN,
    entityType: AuditEntityType.USER,
    entityId: userId,
    entityName: userName,
    description: success ? `用户登录: ${userName}` : `用户登录失败: ${userName}`,
    status: success ? 'success' : 'failed',
    errorMessage,
  });
}

/**
 * 便捷函数：记录登出
 */
export async function auditLogout(
  req: Request,
  userId: string,
  userName: string
): Promise<void> {
  await createAuditLog(req, {
    action: AuditAction.LOGOUT,
    entityType: AuditEntityType.USER,
    entityId: userId,
    entityName: userName,
    description: `用户登出: ${userName}`,
  });
}

/**
 * 获取实体类型中文标签
 */
function getEntityTypeLabel(entityType: string): string {
  const labels: Record<string, string> = {
    strategy: '战略',
    plan: '计划',
    task: '任务',
    user: '用户',
    department: '部门',
    meeting: '会议',
    issue: '问题',
    dailyLog: '日报',
    weeklyReport: '周报',
    assessment: '考核',
    changeRequest: '变更申请',
    workflow: '工作流',
    system: '系统',
  };
  return labels[entityType] || entityType;
}

/**
 * 获取操作类型中文标签
 */
export function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    create: '创建',
    update: '更新',
    delete: '删除',
    view: '查看',
    submit: '提交',
    review: '审核',
    approve: '批准',
    reject: '驳回',
    withdraw: '撤回',
    cancel: '取消',
    complete: '完成',
    assign: '分配',
    accept: '接受',
    start: '开始',
    pause: '暂停',
    resume: '恢复',
    login: '登录',
    logout: '登出',
    password_change: '修改密码',
    export: '导出',
    import: '导入',
    backup: '备份',
    restore: '恢复',
    settings_update: '更新设置',
    permission_grant: '授权',
    permission_revoke: '撤销权限',
    role_assign: '分配角色',
  };
  return labels[action] || action;
}
