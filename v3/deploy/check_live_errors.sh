#!/bin/bash
# 检查最近的后端日志（用户操作产生的）
echo "=== 最近50行日志 ==="
tail -200 /home/ubuntu/acematic/backend-src/backend.log | grep -E 'POST|PUT|error|Error|fail|500|401|403|404' | tail -30

echo ""
echo "=== 最后20行完整日志 ==="
tail -20 /home/ubuntu/acematic/backend-src/backend.log