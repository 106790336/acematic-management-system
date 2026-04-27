# ACEMATIC运营管理系统 V3 - 微云文件索引

## 微云目录分享链接
**完整项目下载**: https://share.weiyun.com/GCUFYqGR

## 技术栈
- **后端**: Node.js + Express + Prisma ORM + TypeScript
- **前端**: React + TypeScript + shadcn/ui (TailwindCSS) + Vite
- **数据库**: SQLite → PostgreSQL
- **认证**: JWT + bcrypt

## 项目结构
```
workspace/
├── backend/                    # Node.js后端
│   ├── prisma/
│   │   ├── schema.prisma        # 数据库模型（22KB）
│   │   ├── seed.ts              # 种子数据（35KB）
│   │   └── dev.db               # SQLite数据库
│   ├── src/
│   │   ├── app.ts               # Express主入口
│   │   ├── index.ts             # 启动入口
│   │   ├── config/              # 配置
│   │   ├── middleware/           # 中间件（JWT验证等）
│   │   ├── modules/             # 业务模块（21个）
│   │   │   ├── auth.ts          # 认证（5.8KB）
│   │   │   ├── tasks.ts         # 任务管理（12.7KB）
│   │   │   ├── tasks-v2.ts      # 子任务管理（20.3KB）
│   │   │   ├── strategies.ts    # 战略管理（13.2KB）
│   │   │   ├── plans.ts         # 计划管理（12.7KB）
│   │   │   ├── planning.ts      # 规划管理（13KB）
│   │   │   ├── workflows.ts     # 审批流程（10.1KB）
│   │   │   ├── change-requests.ts # 变更申请（10.4KB）
│   │   │   ├── audit-logs.ts    # 审计日志（8KB）
│   │   │   ├── assessments.ts   # 考核管理（11.4KB）
│   │   │   ├── departments.ts   # 部门管理（7.6KB）
│   │   │   ├── users.ts         # 用户管理（10KB）
│   │   │   ├── execution.ts     # 执行追踪（10.7KB）
│   │   │   ├── weekly-reports.ts # 周报管理（4.4KB）
│   │   │   ├── issues.ts        # 问题管理（6.4KB）
│   │   │   ├── dashboard.ts     # 运营驾驶舱（5.5KB）
│   │   │   ├── settings.ts      # 系统设置（11.6KB）
│   │   │   ├── system-version.ts # 版本管理（6.5KB）
│   │   │   ├── backup.ts        # 备份管理（14.1KB）
│   │   │   ├── system.ts        # 系统管理（2.8KB）
│   │   │   └── health.ts        # 健康检查（2KB）
│   │   ├── types/               # TypeScript类型定义
│   │   ├── utils/               # 工具函数
│   │   ├── scripts/             # 脚本
│   │   └── __tests__/           # 测试
│   ├── package.json
│   └── README.md
├── frontend/                   # React前端
│   ├── src/
│   │   ├── pages/               # 页面组件
│   │   ├── components/          # 通用组件
│   │   ├── types/               # TypeScript类型
│   │   └── lib/                 # 工具库
│   ├── package.json
│   └── dist/                    # 构建产物
├── docs/                       # 文档
├── deploy/                     # 部署配置
└── DEPLOYMENT.md               # 部署指南
```

## 已实现功能清单
- ✅ 用户认证（JWT + bcrypt）
- ✅ 角色权限体系（admin/director/manager/employee）
- ✅ 部门管理（树形结构）
- ✅ 战略管理（创建/审批/状态流转/进度追踪）
- ✅ 计划管理（分解/分配/审批）
- ✅ 任务管理（子任务分解/进度更新/验收）
- ✅ 审批流程（多级审批/自定义角色/用户审批）
- ✅ 变更申请（审批后方可修改已生效内容）
- ✅ 审计日志（全操作记录）
- ✅ 考核管理（月度/季度/年度考核）
- ✅ 周报管理
- ✅ 问题管理
- ✅ 版本管理（系统版本部署/回滚）
- ✅ 备份管理
- ✅ 战略对齐视图
- ✅ 每日日志
- ✅ 运营驾驶舱

## 从微云下载完整项目
1. 访问 https://share.weiyun.com/GCUFYqGR
2. 下载workspace目录
3. 排除node_modules目录后上传到GitHub

## 关键文件微云分享链接
- Prisma Schema: https://share.weiyun.com/MXbSEWPE
- Backend README: https://share.weiyun.com/yfREgEhy
- Package.json: https://share.weiyun.com/X8ica1vO
- App主入口: https://share.weiyun.com/8ws3Oogx
- Tasks v2: https://share.weiyun.com/n9MSHbrl
- 部署指南: https://share.weiyun.com/6n48qeE7
