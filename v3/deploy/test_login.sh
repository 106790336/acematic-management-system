#!/bin/bash
# Debug login
echo "=== Raw login response ==="
curl -sv -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"ceo","password":"123456"}' 2>&1