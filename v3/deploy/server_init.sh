#!/bin/bash
cd /home/ubuntu/acematic/backend-src

# 停止后端
pkill -f "tsx watch" 2>/dev/null || true
sleep 2

# 删除旧数据库
rm -f prisma/dev.db
echo "DB deleted"

# 重新生成 Prisma 客户端
npx prisma generate 2>&1

# 数据库迁移
npx prisma db push --accept-data-loss 2>&1

# 运行 seed
npx tsx prisma/seed.ts 2>&1

# 重启后端
nohup npx tsx watch src/index.ts > backend.log 2>&1 &
sleep 3

# 检查后端状态
curl -s http://127.0.0.1:3000/api/health
