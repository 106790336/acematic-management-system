#!/bin/bash
# Test ACEMATIC API - Fixed

TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"ceo","password":"123456"}' | jq -r '.data.token')
echo "Token: ${TOKEN:0:20}..."

# Get active strategy
echo -e "\n=== Active Strategies ==="
ACTIVE=$(curl -s "http://localhost:3000/api/strategies?status=active" -H "Authorization: Bearer $TOKEN")
echo "$ACTIVE" | jq '.data.items[] | {id,title,status}'

SID=$(echo "$ACTIVE" | jq -r '.data.items[0].id // empty')
if [ -z "$SID" ]; then
  echo "No active strategy found. Submitting O1 for review..."
  O1_ID=$(curl -s http://localhost:3000/api/strategies -H "Authorization: Bearer $TOKEN" | jq -r '.data.items[0].id')
  curl -s -X POST "http://localhost:3000/api/strategies/$O1_ID/submit" -H "Authorization: Bearer $TOKEN" | jq .
  curl -s -X POST "http://localhost:3000/api/strategies/$O1_ID/review" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"approved":true,"comment":"auto approve"}' | jq .
  SID=$O1_ID
fi

echo -e "\n=== Create Change Request for Strategy ==="
CR=$(curl -s -X POST http://localhost:3000/api/change-requests \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"entityType\":\"strategy\",\"entityId\":\"$SID\",\"requestType\":\"modify\",\"reason\":\"测试变更申请\",\"newData\":{\"title\":\"变更测试标题\"}}")
echo "$CR" | jq .

CR_ID=$(echo "$CR" | jq -r '.data.id // empty')
if [ -n "$CR_ID" ]; then
  echo -e "\n=== Review Change Request ==="
  curl -s -X POST "http://localhost:3000/api/change-requests/$CR_ID/review" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"approved":true,"comment":"审核通过"}' | jq .
fi

echo -e "\n=== All Change Requests ==="
curl -s http://localhost:3000/api/change-requests -H "Authorization: Bearer $TOKEN" | jq '.data.items[] | {id,status,entityType,reason}'

# Get tasks
echo -e "\n=== Tasks ==="
curl -s http://localhost:3000/api/tasks-v2 -H "Authorization: Bearer $TOKEN" | jq '.data.items[] | {id,title,status}'

# Get plans
echo -e "\n=== Active Plans ==="
curl -s "http://localhost:3000/api/plans?status=active" -H "Authorization: Bearer $TOKEN" | jq '.data.items[] | {id,title,status}'