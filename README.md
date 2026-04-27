# ACEMATIC 运营管理系统 V2.0

一套面向中小企业管理层的战略执行工具，覆盖「战略解码→目标分解→执行跟踪→复盘调整→绩效考核」全流程闭环。

## 📦 系统版本

| 版本 | 技术栈 | 适用场景 |
|------|--------|---------|
| **网页版** | HTML单文件 | 无需部署，浏览器直接打开 |
| **Excel版** | Excel 7工作表 | 熟悉Excel操作，灵活编辑 |
| **微搭版** | 腾讯云微搭低代码 | 企业微信深度集成 |
| **完整版** | Vue3 + Flask前后端 | 正式部署，多人协作 |

## 🎯 核心功能

### 1. 战略解码
- 年度目标设定（营收4000万/利润700万）
- 季度分解→月度分解→周计划→日任务
- 三中心战略分解（营销/产品/运营）

### 2. 执行跟踪
- 任务分配与进度追踪
- 质量管控一票否决制
- 预警机制自动触发

### 3. 复盘分析
- 日复盘→周复盘→月复盘→季度复盘
- AI智能摘要与分析报告
- 偏差原因诊断

### 4. 绩效考核
- 58个KPI指标库
- 工资自动计算（固定+管理绩效+经营绩效）
- 一票否决执行记录

## 🏗️ 项目结构

```
acematic-management-system-v2/
├── docs/                    # 设计文档
│   ├── 01_完整计划管理系统_设计方案.md
│   ├── 02_三中心完整闭环管理系统.md
│   ├── 03_2026年度整体解决方案.md    # 基于2025真实数据分析
│   ├── 运营管理系统_PRD_v1.0.md
│   └── 质量管控流程图.jpg
│
├── frontend/                # 前端代码
│   ├── src/
│   │   ├── views/          # Vue页面组件
│   │   ├── layouts/        # 布局组件
│   │   ├── stores/         # Pinia状态管理
│   │   ├── router/         # 路由配置
│   │   └── api/            # API接口
│   ├── web-version.html    # 单文件网页版
│   ├── package.json
│   └── vite.config.js
│
├── backend/                 # 后端代码
│   ├── app.py              # Flask主应用（600+行）
│   ├── schema.sql          # 数据库设计
│   └── requirements.txt    # Python依赖
│
├── excel-version/           # Excel版本
│   ├── ACEMATIC_三中心管理系统_完整版.xlsx
│   └── ACEMATIC_2026年度计划_细化版.xlsx
│
├── configs/                 # 微搭平台配置
│   ├── 00_快速上手指南.md
│   ├── 01_数据模型设计文档.md
│   ├── 02_微搭应用搭建指南.md
│   ├── 03_速达ERP集成配置说明.md
│   ├── 04_企业微信集成配置说明.md
│   ├── 05_2026年度目标分解表.md
│   ├── 06_10人KPI指标库.md
│   ├── 一键导入_微搭应用配置.json
│   ├── 模板1_人员信息导入表.csv
│   ├── 模板2_年度目标导入表.csv
│   ├── 模板3_KPI指标库导入表.csv
│   ├── 配置1_速达ERP连接器.yaml
│   └── 配置2_企业微信应用.yaml
│
├── deploy.sh                # 部署脚本（Linux）
├── start.sh                 # 启动脚本
├── railway.toml             # Railway部署配置
├── vercel.json              # Vercel部署配置
└── package.json             # 项目配置
```

## 🚀 快速开始

### 方式1：网页版（零部署）

```bash
# 直接打开浏览器
open frontend/web-version.html
```

### 方式2：本地开发环境

```bash
# 安装后端依赖
cd backend
pip install -r requirements.txt
python app.py  # 启动后端服务

# 安装前端依赖
cd frontend
npm install
npm run dev    # 启动前端开发服务器

# 访问系统
http://localhost:3000
默认账号: admin / admin123
```

### 方式3：一键部署

```bash
# Railway部署（推荐）
railway up

# Vercel部署（仅前端）
vercel

# 或使用部署脚本
chmod +x deploy.sh && ./deploy.sh
```

### 方式4：微搭平台导入

1. 登录 https://weda.cloud.tencent.com/
2. 选择空间ID: 5203131b-f936-49ea-8015-93786cce2fae
3. 导入 `configs/一键导入_微搭应用配置.json`
4. 配置速达ERP和企业微信连接器

## 🔧 配置项

### 数据源配置

```yaml
# configs/配置1_速达ERP连接器.yaml
api_url: https://your-erp-server/api
api_key: YOUR_ERP_API_KEY

# configs/配置2_企业微信应用.yaml
corp_id: YOUR_CORP_ID
agent_id: YOUR_AGENT_ID
secret: YOUR_SECRET
```

### AI能力配置

```python
# backend/app.py
AI_MODEL = 'doubao'  # 可选: doubao/zhipu/ollama
AI_API_KEY = 'your-api-key'
```

## 📊 2026年度战略目标

| 目标类型 | 目标值 | 分解方式 |
|----------|--------|---------|
| 营收目标 | 4000万 | Q1:700万 Q2:900万 Q3:1200万 Q4:1200万 |
| 利润目标 | 700万 | Q1:140万 Q2:175万 Q3:210万 Q4:175万 |
| 团队规模 | 12人 | 营销3人/产品3人/运营6人 |

### 三中心架构

- **营销中心**: 市场占有率15%/客户满意度95%/销售增长30%
- **产品中心**: 合格率99%/研发创新3项/交付准时率98%
- **运营中心**: 费用率≤15%/流失率≤5%/效率提升20%

## 🤖 AI功能

- 周报智能摘要（自动提取关键信息）
- 月度分析报告生成（偏差分析+改进建议）
- 预警智能研判（根据历史数据预测风险）
- 绩效异常诊断（自动识别低绩效根因）

## 🔗 相关链接

- 原版仓库: https://github.com/106790336/operations-management
- 微搭平台: https://weda.cloud.tencent.com/

## 📝 更新日志

### V2.0 (2026-04-27)
- 整合ACEMATIC真实业务数据（2025年2394万销售分析）
- 新增2026年度战略方案文档
- 完善三中心闭环管理系统设计
- 优化微搭配置包一键导入
- 新增单文件网页版（零部署）

### V1.0 (2026-04-06)
- Vue3 + Flask前后端分离架构
- 7大核心功能模块
- Railway/Vercel一键部署支持

## 许可证

MIT License

---

**系统已准备就绪，随时可以开始实施！** 🎯