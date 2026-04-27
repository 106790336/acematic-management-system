#!/bin/bash
# 获取完整的 PrismaClientValidationError 详情
echo "=== 完整 Prisma 错误 ==="
tail -500 /home/ubuntu/acematic/backend-src/backend.log | grep -A20 'PrismaClientValidationError' | head -40

echo ""
echo "=== 最近所有 POST/PUT 请求 ==="
tail -1000 /home/ubuntu/acematic/backend-src/backend.log | grep -E 'POST|PUT' | tail -30

echo ""
echo "=== 检查 ContentVersion 模型是否存在 ==="
cd /home/ubuntu/acematic/backend-src
grep -c 'model ContentVersion' prisma/schema.prisma

echo ""
echo "=== 检查数据库表结构 ==="
npx prisma db pull --print 2>&1 | head -50
