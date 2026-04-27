#!/bin/bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"ceo","password":"123456"}' | jq -r '.data.token')
echo "Token: ${TOKEN:0:20}..."

echo -e "\n=== Test Create Log ==="
curl -s -X POST http://localhost:3000/api/execution \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"logDate":"2026-04-25","workContent":"测试日志内容","workHours":8,"progress":50}'

echo -e "\n\n=== Test Create Issue ==="
DEPT_ID=$(curl -s http://localhost:3000/api/departments/list -H "Authorization: Bearer $TOKEN" | jq -r '.data[0].id')
curl -s -X POST http://localhost:3000/api/issues \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"source\":\"测试来源\",\"discoveryDate\":\"2026-04-25\",\"departmentId\":\"$DEPT_ID\",\"description\":\"测试问题描述\",\"issueType\":\"质量问题\",\"severity\":\"中\"}"

echo -e "\n\n=== Test Create Task ==="
curl -s -X POST http://localhost:3000/api/tasks-v2 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"测试任务","description":"测试任务描述","priority":"medium"}'

echo -e "\n"