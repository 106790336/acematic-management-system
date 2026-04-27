#!/bin/bash
cd /home/ubuntu/acematic/backend-src

# Start backend
screen -dmS ace-backend bash -c 'npx tsx src/index.ts 2>&1 | tee backend.log'
sleep 4

# Health check
echo "=== Health Check ==="
curl -s http://localhost:3000/api/health

# Login
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"ceo","password":"123456"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")
echo ""
echo "=== Token: ${TOKEN:0:20}... ==="

# Test 1: Create Task
echo ""
echo "=== Test Create Task ==="
curl -s -X POST http://localhost:3000/api/tasks-v2 \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"端口清理后测试任务"}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'success={d[\"success\"]}, title={d[\"data\"][\"title\"]}')"

# Test 2: Create Log
echo ""
echo "=== Test Create Log ==="
curl -s -X POST http://localhost:3000/api/execution \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"logDate":"2026-04-25","workContent":"测试日志","workHours":8,"progress":50}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'success={d[\"success\"]}, id={d[\"data\"][\"id\"]}')"

# Test 3: Create Issue
echo ""
echo "=== Test Create Issue ==="
DEPT=$(curl -s http://localhost:3000/api/departments/list -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; print(json.load(sys.stdin)['data'][0]['id'])")
curl -s -X POST http://localhost:3000/api/issues \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"source\":\"test\",\"discoveryDate\":\"2026-04-25\",\"departmentId\":\"$DEPT\",\"description\":\"test issue\",\"issueType\":\"quality\",\"severity\":\"low\"}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'success={d[\"success\"]}, number={d[\"data\"][\"issueNumber\"]}')"

# Test 4: Change Request Review
echo ""
echo "=== Test Change Request ==="
SID=$(curl -s "http://localhost:3000/api/strategies?status=active" -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['items'][0]['id'])")
CR=$(curl -s -X POST http://localhost:3000/api/change-requests \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"entityType\":\"strategy\",\"entityId\":\"$SID\",\"requestType\":\"modify\",\"reason\":\"UI fix test\",\"newData\":{\"description\":\"updated desc\"}}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['id'])")
echo "CR created: $CR"
curl -s -X POST "http://localhost:3000/api/change-requests/$CR/review" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"approved":true,"comment":"OK"}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Review success={d[\"success\"]}, status={d[\"data\"][\"status\"]}')"

# Test 5: Check frontend index.html
echo ""
echo "=== Frontend HTML ==="
head -5 /home/ubuntu/acematic/frontend/dist/index.html
