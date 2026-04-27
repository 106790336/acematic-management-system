#!/bin/bash
# 测试 curl 通过 nginx 的登录
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"ceo","password":"123456"}' \
  http://43.138.204.20/api/auth/login
