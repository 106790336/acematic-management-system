# 🚀 运营管理系统 - 零成本一键部署指南

## 部署架构

```
┌─────────────────┐         ┌─────────────────┐
│   Vercel        │   API   │   Railway       │
│   (前端托管)     │ ──────> │   (后端+数据库)  │
│   免费 ✓         │         │   免费 ✓         │
└─────────────────┘         └─────────────────┘
        │                           │
        └───────────┬───────────────┘
                    │
            用户通过浏览器访问
```

---

## 📋 部署前准备

### 必需账号（全部免费）
1. **GitHub账号** - 代码托管
2. **Vercel账号** - 前端托管（可用GitHub登录）
3. **Railway账号** - 后端托管（可用GitHub登录）

### 预计时间
- 首次部署：15-20分钟
- 后续更新：2-3分钟

---

## 第一步：上传代码到GitHub（5分钟）

### 1.1 在GitHub创建新仓库

1. 登录 [github.com](https://github.com)
2. 点击右上角 `+` → `New repository`
3. 填写信息：
   - Repository name: `operations-management-system`
   - Description: `运营管理系统`
   - 选择 `Public`（免费部署需要公开仓库）
   - ✅ 勾选 `Add a README file`
4. 点击 `Create repository`

### 1.2 上传本地代码

**方式A：使用Git命令行（推荐）**

```bash
# 在项目根目录执行
git init
git add .
git commit -m "初始化运营管理系统"
git branch -M main
git remote add origin https://github.com/你的用户名/operations-management-system.git
git push -u origin main
```

**方式B：网页上传（适合不熟悉Git的用户）**

1. 在GitHub仓库页面点击 `uploading an existing file`
2. 拖拽整个项目文件夹
3. 填写Commit信息，点击 `Commit changes`

---

## 第二步：部署后端到Railway（8分钟）

### 2.1 创建Railway项目

1. 访问 [railway.app](https://railway.app)
2. 点击 `Start a New Project`
3. 选择 `Deploy from GitHub repo`
4. 授权GitHub，选择你的仓库
5. Railway会自动检测Python项目

### 2.2 配置环境变量

在Railway项目页面，点击 `Variables` 标签，添加：

```
JWT_SECRET_KEY=your-super-secret-key-change-this-2024
FLASK_ENV=production
PORT=5000
```

### 2.3 配置构建命令

点击 `Settings` → `Build`，确保配置为：
- Build Command: `cd backend && pip install -r requirements.txt`
- Start Command: `cd backend && python app.py`

### 2.4 获取后端URL

部署成功后：
1. 点击 `Settings` → `Domains`
2. 点击 `Generate Domain`
3. Railway会自动分配一个域名，如：`https://operations-management.up.railway.app`
4. **复制这个URL，后面会用到**

### 2.5 验证后端

访问：`https://你的域名/api/health`

如果返回 `{"status": "ok"}`，说明后端部署成功！

---

## 第三步：配置前端API地址（2分钟）

### 3.1 修改生产环境配置

在GitHub仓库中，编辑文件：`frontend/.env.production`

```bash
# 将 your-backend-url 替换为Railway分配的域名
VITE_API_BASE_URL=https://operations-management.up.railway.app/api
```

同时编辑：`frontend/vercel.json` 和 `vercel.json`，将所有 `your-backend-url.railway.app` 替换为实际域名。

### 3.2 提交修改

```bash
git add .
git commit -m "配置生产环境API地址"
git push
```

---

## 第四步：部署前端到Vercel（5分钟）

### 4.1 创建Vercel项目

1. 访问 [vercel.com](https://vercel.com)
2. 点击 `Add New...` → `Project`
3. 选择你的GitHub仓库
4. Vercel会自动检测Vue项目

### 4.2 配置项目

在配置页面：
- **Framework Preset**: Vue.js
- **Root Directory**: `./frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

点击 `Environment Variables`，添加：
```
VITE_API_BASE_URL = https://operations-management.up.railway.app/api
```

### 4.3 开始部署

点击 `Deploy`，等待2-3分钟。

### 4.4 获取前端URL

部署成功后，Vercel会分配一个域名，如：
`https://operations-management.vercel.app`

---

## 第五步：测试验证（1分钟）

### 5.1 访问系统

打开浏览器，访问Vercel分配的域名。

### 5.2 登录测试

- 账号：`admin`
- 密码：`admin123`

### 5.3 功能测试

1. 查看运营驾驶舱数据
2. 创建新的年度目标
3. 提交月度计划
4. 填写周报
5. 记录问题清单

如果所有功能正常，恭喜你，部署成功！

---

## 📊 免费额度说明

### Railway免费额度
- 每月 $5 免费额度
- 本项目月消耗约 $2-3（足够使用）
- 数据库存储 1GB
- 流量 1GB/月

### Vercel免费额度
- 带宽：100GB/月
- 构建时间：6000分钟/月
- 无并发限制

### 常见问题

**Q: Railway提示额度不足怎么办？**
A: Railway免费额度用完后会暂停服务。解决方案：
1. 升级到Hobby计划（$5/月）
2. 迁移到其他免费平台（Render、Fly.io）

**Q: 如何绑定自定义域名？**
A: 
1. Vercel：Settings → Domains → Add
2. Railway：Settings → Domains → Custom Domain
3. 在域名服务商配置CNAME指向

**Q: 数据库会丢失吗？**
A: Railway的SQLite文件会持久化，但建议定期备份：
- 方式1：定期导出数据
- 方式2：升级到PostgreSQL（Railway提供免费PostgreSQL）

---

## 🔄 后续更新流程

### 代码更新后自动部署

1. 本地修改代码
2. `git add .`
3. `git commit -m "更新说明"`
4. `git push`

Vercel和Railway会自动检测GitHub更新并重新部署！

### 查看部署状态

- Vercel：项目面板 → Deployments
- Railway：项目面板 → Deployments

---

## 🎯 一键部署脚本（可选）

如果你熟悉命令行，可以使用以下脚本快速部署：

```bash
#!/bin/bash

echo "🚀 开始部署运营管理系统..."

# 1. 推送代码到GitHub
echo "📤 推送代码到GitHub..."
git add .
git commit -m "准备部署"
git push

# 2. 使用Railway CLI部署后端
echo "🔧 部署后端到Railway..."
railway login
railway init
railway up

# 3. 使用Vercel CLI部署前端
echo "🎨 部署前端到Vercel..."
cd frontend
vercel --prod

echo "✅ 部署完成！"
```

---

## 📞 技术支持

如遇问题，按以下顺序排查：

1. **后端无法访问**
   - 检查Railway日志：项目 → Deployments → 查看日志
   - 确认环境变量配置正确

2. **前端无法连接后端**
   - 检查 `.env.production` 中的API地址
   - 确认Vercel环境变量配置

3. **登录失败**
   - 检查后端是否正常启动
   - 查看浏览器控制台错误信息

---

## 🎉 恭喜！

你已经成功将运营管理系统部署到云端，实现了：

✅ 零成本（完全免费）
✅ 自动部署（推送代码自动更新）
✅ 高可用（Railway + Vercel全球CDN）
✅ 数据持久化（SQLite数据库）

现在可以开始使用了！
