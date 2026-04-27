# ACEMATIC V3 临时测试平台 - 隔离部署方案

> 原则: 与生产环境完全隔离，零影响
> 更新: 2026-04-27

---

## 🚧 隔离策略（5层隔离）

| 维度 | 生产环境 | 测试平台 | 隔离措施 |
|------|----------|----------|----------|
| **部署目录** | `/opt/acematic/` | `/opt/acematic-test/` | 独立目录 |
| **后端端口** | `3001` | `3011` | 不冲突 |
| **前端端口** | `8080` | `8181` | 不冲突 |
| **数据库** | `/opt/acematic/backend/prisma/dev.db` | `/opt/acematic-test/backend/prisma/test.db` | 独立SQLite文件 |
| **进程管理** | `pm2: acematic-backend` | `pm2: acematic-test-backend` | 独立进程名 |
| **Nginx配置** | `/etc/nginx/sites-enabled/acematic` | `/etc/nginx/sites-enabled/acematic-test` | 独立配置文件 |
| **日志文件** | `/var/log/acematic/` | `/var/log/acematic-test/` | 独立日志 |

---

## 📁 目录结构

```
/opt/acematic-test/              ← 测试平台根目录（全新）
├── backend/
│   ├── prisma/
│   │   └── test.db              ← 独立数据库（非dev.db）
│   ├── dist/                     ← 构建产物
│   └── .env                      ← 独立环境变量
├── frontend/
│   └── dist/                     ← 前端构建产物
└── uploads/                      ← 独立上传目录
```

---

## 🔒 安全规则

1. **不读取任何生产数据库** — 使用全新的test.db
2. **不占用生产端口** — 3011 + 8181
3. **不修改生产Nginx** — 独立配置文件
4. **不替换生产进程** — 独立PM2进程名
5. **测试完毕可一键删除** — `rm -rf /opt/acematic-test/`
