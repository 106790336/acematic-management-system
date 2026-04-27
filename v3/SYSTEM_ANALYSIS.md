# ACEMATIC V3 系统深度分析与迭代方案

> 分析时间: 2026-04-27 23:00
> 分析范围: Prisma Schema + 21个后端模块 + 20个前端页面 + 认证/权限体系

---

## 一、系统架构全景

### 1.1 数据模型分析（40+ Prisma模型）

| 核心层级 | 模型 | 关系 |
|----------|------|------|
| **战略层** | Strategy → Plan → Task | 三级分解结构 |
| **组织层** | Department → User → Role → Permission | 完整RBAC |
| **执行层** | TaskExecutionRecord, DailyLog, WeeklyReport | 执行追踪 |
| **审批层** | Workflow → WorkflowStep, ChangeRequest | 流程管控 |
| **审计层** | AuditLog, ContentVersion, SystemVersion | 全量追溯 |

### 1.2 前端页面路由

```
/login → 登录
/dashboard → 数据看板（图表+统计）
/strategy → 战略管理
/plan → 计划管理
/tasks → 任务管理（含子任务）
/department → 部门管理
/users → 用户管理
/assessment → 考核管理
/weekly-reports → 周报
/issues → 问题管理
/change-requests → 变更申请
/audit-logs → 审计日志
/settings → 系统设置
/system-versions → 版本管理
/alignment → 战略对齐视图
```

### 1.3 权限角色体系

| 角色 | 权限范围 | 对应业务角色 |
|------|----------|--------------|
| `ceo` | 全部权限 | CEO |
| `executive` | 高管权限 | 高管层 |
| `manager` | 本部门管理 | 部门负责人 |
| `employee` | 个人任务+周报 | 员工 |

---

## 二、🔴 发现的问题

### P0 Critical: Schema与代码不一致

#### 问题1: Task模型字段缺失
**Schema定义的Task字段**:
```prisma
- taskNumber, title, description, status, priority, progress
- planId, assigneeId, createdById, approverId
- dueDate, completedAt, submittedAt, reviewedAt
- strategicAlignment, reviewComment
```

**tasks-v2.ts实际使用的字段**（Schema中不存在）:
```typescript
❌ sourceType, sourceRef, goalId
❌ quarterlyPlanId, monthlyPlanId, weeklyPlanId
❌ confirmedAt, confirmedById
❌ approvedAt, approvalComment, approverId (存在但用法不同)
❌ verifyResult, verifiedAt, verifiedById
❌ parentTaskId (子任务关系)
```

**影响**: 子任务分解功能可能无法正常工作

#### 问题2: TaskSource模型不匹配
Schema中TaskSource:
```prisma
model TaskSource {
  id, name, description, createdAt, updatedAt
  tasks: Task[]  // 一对多
}
```

tasks-v2.ts创建的TaskSource:
```typescript
{
  taskId, sourceType, sourceId, 
  sourcePlanId, sourceGoalId  // Schema中不存在
}
```

#### 问题3: WorkflowStep缺少roleId字段
workflows.ts使用:
```typescript
step.roleId  // 按角色审批
step.reviewerId  // 指定用户审批
```

Schema中只有:
```prisma
model WorkflowStep {
  reviewerId  // 仅此一个
}
```

### P1 Major: 功能性问题

#### 问题4: 子任务进度自动计算缺失
- Schema有parentTaskId关系但无递归计算逻辑
- tasks-v2.ts提到subTasks但无聚合计算代码

#### 问题5: 审批流程与状态流转不匹配
Task状态流（代码中）:
```
draft → pending → active → pending_acceptance → completed
```

但Schema中缺少:
- `confirmed` 状态
- `pending_acceptance` 状态对应的字段

### P2 Minor: 体验问题

#### 问题6: 移动端适配不完整
- Dashboard使用了Recharts（移动端需优化）
- 表格组件可能在小屏溢出

#### 问题7: 预警提醒硬编码
Dashboard中预警数据是硬编码示例，需接入真实数据源

---

## 三、迭代方案（按优先级）

### 🔴 Phase 1: 核心修复（立即）

**目标**: 解决Schema与代码不一致问题

#### 任务清单

| 任务 | 内容 | 影响范围 |
|------|------|----------|
| **T1-1** | 扩展Task模型，添加缺失字段 | 数据库 |
| **T1-2** | 重构TaskSource模型 | 数据库 |
| **T1-3** | 扩展WorkflowStep添加roleId | 数据库 |
| **T1-4** | 添加子任务进度计算逻辑 | 后端 |
| **T1-5** | 统一Task状态流转枚举 | 全栈 |

#### T1-1: Task模型扩展建议

```prisma
model Task {
  // 新增字段
  parentTaskId    String?        // 父任务ID（子任务关系）
  sourceType      String?        // 来源类型
  sourceRef       String?        // 来源引用
  goalId          String?        // 年度目标关联
  quarterlyPlanId String?        // 季度计划关联
  monthlyPlanId   String?        // 月度计划关联
  weeklyPlanId    String?        // 周计划关联
  
  // 状态流转字段
  confirmedAt     DateTime?      // 确认接收时间
  confirmedById   String?        // 确认人
  approvedAt      DateTime?      // 审批时间
  approvalComment String?        // 审批意见（已有reviewComment，需统一）
  verifyResult    String?        // 验收结果
  verifiedAt      DateTime?      // 验收时间
  verifiedById    String?        // 验收人
  
  // 关系
  parentTask      Task?          @relation("TaskHierarchy", fields: [parentTaskId], references: [id])
  subTasks        Task[]         @relation("TaskHierarchy")
}
```

#### T1-4: 子任务进度计算逻辑

```typescript
// 添加到 tasks-v2.ts
async function calculateParentProgress(parentTaskId: string) {
  const subTasks = await prisma.task.findMany({
    where: { parentTaskId },
    select: { progress: true, status: true }
  });
  
  if (subTasks.length === 0) return;
  
  // 权重平均计算
  const totalProgress = subTasks.reduce((sum, t) => sum + t.progress, 0);
  const avgProgress = Math.round(totalProgress / subTasks.length);
  
  // 更新父任务进度
  await prisma.task.update({
    where: { id: parentTaskId },
    data: { progress: avgProgress }
  });
  
  // 递归向上更新
  const parent = await prisma.task.findUnique({
    where: { id: parentTaskId },
    select: { parentTaskId: true }
  });
  
  if (parent?.parentTaskId) {
    await calculateParentProgress(parent.parentTaskId);
  }
}
```

---

### 🟡 Phase 2: 数据导入（本周）

**目标**: 导入ACEMATIC真实组织数据

#### 数据准备清单

| 数据项 | 内容 | 来源 |
|------|------|------|
| 部门架构 | 三中心+各部门 | ACEMATIC组织图 |
| 用户数据 | 28人信息 | 通讯录 |
| 角色分配 | CEO/负责人/员工 | 岗位对应 |
| 年度目标 | 4000万营收 | 战略目标 |
| 权限配置 | 各角色权限码 | 权限矩阵 |

#### 导入脚本框架

```typescript
// seed-acematic.ts
const departments = [
  { name: '运营中心', manager: '张三', children: [...] },
  { name: '研发中心', manager: '李四', children: [...] },
  { name: '销售中心', manager: '王五', children: [...] },
];

const users = [
  { name: '王少荣', role: 'ceo', department: null },  // CEO
  { name: '张三', role: 'manager', department: '运营中心' },
  // ... 28人
];

const annualGoals = [
  { year: 2026, title: '营收目标', target: '4000万', owner: 'ceo' },
  { year: 2026, title: '利润目标', target: '700万', owner: 'ceo' },
];
```

---

### 🟢 Phase 3: 功能完善（下周）

#### 任务清单

| 任务 | 内容 | 优先级 |
|------|------|--------|
| **T3-1** | 审批流程完整实现 | P1 |
| **T3-2** | Dashboard预警数据接入 | P2 |
| **T3-3** | 移动端响应式优化 | P2 |
| **T3-4** | 周报→考核数据联动 | P2 |
| **T3-5** | 企业微信消息通知 | P3 |

#### T3-1: 审批流程实现

```typescript
// 统一审批逻辑
async function processApproval(entityType: string, entityId: string, userId: string, approved: boolean) {
  // 1. 获取实体对应的工作流
  const workflow = await prisma.workflow.findUnique({
    where: { entityType },
    include: { steps: { orderBy: { level: 'asc' } } }
  });
  
  // 2. 检查当前审批人是否在流程中
  // 3. 记录审批结果
  // 4. 更新实体状态
  // 5. 通知下一级审批人或发起人
}
```

---

### 🔵 Phase 4: 扩展功能（按需）

| 功能 | 描述 | 技术方案 |
|------|------|----------|
| 数据导出 | Excel/PDF报表 | exceljs + pdfkit |
| 定时提醒 | 周报提醒/逾期预警 | node-cron |
| 移动端App | 独立App | React Native 或 Flutter |
| API文档 | Swagger/OpenAPI | swagger-jsdoc |

---

## 四、测试建议

### 4.1 核心闭环测试路径

```
登录(admin)
  → 创建部门（运营中心）
  → 创建用户（部门负责人）
  → 创建战略（2026营收目标）
  → 创建计划（季度计划）
  → 创建任务（分解任务）
  → 创建子任务（任务分解）
  → 更新子任务进度（自动计算父任务进度）
  → 提交验收
  → CEO审批通过
  → 验证审计日志完整记录
```

### 4.2 问题发现反馈格式

```
【BUG-XXX】问题简述

发现位置: 页面/功能
操作步骤: 1...2...3...
预期结果: ...
实际结果: ...
截图: [可选]
严重程度: Critical/Major/Minor
```

---

## 五、下一步行动

**立即执行**:
1. 部署Schema修复脚本（T1-1至T1-3）
2. 测试登录→Dashboard→部门管理基本流程
3. 反馈任何问题，我将立即定位并修复

**需要您提供**:
1. 测试平台是否可访问？
2. 是否有ACEMATIC组织架构详细数据？
3. 是否发现具体的功能问题？