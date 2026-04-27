#!/bin/bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"ceo","password":"123456"}' | jq -r '.data.token')

echo "=== Test Change Request Review ==="

# 1. Create a change request
echo -e "\n--- Step 1: Create CR ---"
SID=$(curl -s http://localhost:3000/api/strategies?status=active -H "Authorization: Bearer $TOKEN" | jq -r '.data.items[0].id')
CR=$(curl -s -X POST http://localhost:3000/api/change-requests \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"entityType\":\"strategy\",\"entityId\":\"$SID\",\"requestType\":\"modify\",\"reason\":\"API审核测试\",\"newData\":{\"title\":\"变更后标题\"}}")
echo "$CR" | jq .
CR_ID=$(echo "$CR" | jq -r '.data.id')

# 2. Review the CR
echo -e "\n--- Step 2: Review CR ---"
curl -s -X POST "http://localhost:3000/api/change-requests/$CR_ID/review" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"approved":true,"comment":"API审核通过"}' | jq .

# 3. Check settings/permissions (workflows)
echo -e "\n--- Step 3: Workflows ---"
curl -s http://localhost:3000/api/workflows -H "Authorization: Bearer $TOKEN" | jq .

# 4. Check settings/roles
echo -e "\n--- Step 4: Roles ---"
curl -s http://localhost:3000/api/settings/roles -H "Authorization: Bearer $TOKEN" | jq .

# 5. Check frontend version
echo -e "\n--- Step 5: Frontend JS files ---"
ls -la /home/ubuntu/acematic/frontend/dist/assets/index-*.js 2>/dev/null