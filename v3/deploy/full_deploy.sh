#!/bin/bash
# 更新 nginx 配置并重启
sudo cp /tmp/acematic_nginx.conf /etc/nginx/sites-enabled/acematic
sudo nginx -t
if [ $? -eq 0 ]; then
    sudo systemctl restart nginx
    echo "Nginx restarted successfully"
else
    echo "Nginx config test failed"
fi

# 确认后端只有一个进程
echo ""
echo "=== Backend processes ==="
ps aux | grep 'tsx' | grep -v grep

# 确认后端响应正常
echo ""
echo "=== Health check ==="
curl -s http://localhost:3000/api/health

# 全面 API 测试
echo ""
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"ceo","password":"123456"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")
echo "Token: ${TOKEN:0:20}..."

echo ""
echo "=== Test 1: Create Task ==="
curl -s -X POST http://localhost:3000/api/tasks-v2 \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"全面测试任务","priority":"medium"}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Task: success={d.get(\"success\")}, id={d.get(\"data\",{}).get(\"id\",\"N/A\")}')"

echo ""
echo "=== Test 2: Create Log ==="
curl -s -X POST http://localhost:3000/api/execution \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"logDate":"2026-04-25","workContent":"全面测试日志","workHours":8}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Log: success={d.get(\"success\")}, id={d.get(\"data\",{}).get(\"id\",\"N/A\")}')"

echo ""
echo "=== Test 3: Create Issue (中文 severity) ==="
DEPT=$(curl -s http://localhost:3000/api/departments/list -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; print(json.load(sys.stdin)['data'][0]['id'])")
curl -s -X POST http://localhost:3000/api/issues \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"source\":\"全面测试\",\"discoveryDate\":\"2026-04-25\",\"departmentId\":\"$DEPT\",\"description\":\"全面测试问题\",\"issueType\":\"质量问题\",\"severity\":\"低\"}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Issue: success={d.get(\"success\")}, number={d.get(\"data\",{}).get(\"issueNumber\",\"N/A\")}')"

echo ""
echo "=== Test 4: Change Request Review ==="
SID=$(curl -s "http://localhost:3000/api/strategies?status=active" -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['items'][0]['id'])")
CR=$(curl -s -X POST http://localhost:3000/api/change-requests \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"entityType\":\"strategy\",\"entityId\":\"$SID\",\"requestType\":\"modify\",\"reason\":\"全面测试\",\"newData\":{\"description\":\"全面测试变更\"}}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['id'])")
echo "CR: $CR"
curl -s -X POST "http://localhost:3000/api/change-requests/$CR/review" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"approved":true,"comment":"OK"}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Review: success={d.get(\"success\")}, status={d.get(\"data\",{}).get(\"status\",\"N/A\")}')"

echo ""
echo "=== Test 5: Workflow CRUD ==="
echo "Get workflows:"
curl -s http://localhost:3000/api/workflows -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Workflows: {len(d.get(\"data\",[]))} 个')"
