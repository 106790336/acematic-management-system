#!/bin/bash
# 获取完整的 Prisma 错误详情
echo "=== 完整 Prisma 验证错误 ==="
tail -2000 /home/ubuntu/acematic/backend-src/backend.log | grep -A40 'PrismaClientValidationError' | head -60

echo ""
echo "=== Strategy schema 字段类型 ==="
grep -A5 'startDate\|endDate' /home/ubuntu/acematic/backend-src/prisma/schema.prisma | head -20

echo ""
echo "=== 测试直接用 ISO 字符串更新 Strategy ==="
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"ceo","password":"123456"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")

SID=$(curl -s "http://localhost:3000/api/strategies?status=active" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['items'][0]['id'])")

echo "Strategy ID: $SID"

curl -s -X PUT "http://localhost:3000/api/strategies/$SID" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"测试直接更新"}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Direct update: success={d.get(\"success\")}, error={d.get(\"error\",\"none\")}')"
