#!/bin/bash
# Test ACEMATIC API

# Login
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"ceo","password":"123456"}' | jq -r '.token')
echo "Token: $TOKEN"

# Get strategies
echo "\n=== Strategies ==="
curl -s http://localhost:3000/api/strategies -H "Authorization: Bearer $TOKEN" | jq '.data.items[] | {id,title,status}'

# Test change request creation (strategy)
STRATEGY_ID=$(curl -s http://localhost:3000/api/strategies -H "Authorization: Bearer $TOKEN" | jq -r '.data.items[0].id')
echo "\n=== Testing change request for strategy $STRATEGY_ID ==="
curl -s -X POST http://localhost:3000/api/change-requests \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entityType":"strategy","entityId":"$STRATEGY_ID","requestType":"modify","reason":"测试变更原因","newData":{"title":"测试变更标题"}}' | jq .

# List change requests
echo "\n=== Change Requests ==="
curl -s http://localhost:3000/api/change-requests -H "Authorization: Bearer $TOKEN" | jq '.data.items'