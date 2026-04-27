#!/bin/bash
# Extract unique error types from backend log
tail -1000 /home/ubuntu/acematic/backend-src/backend.log | grep -E 'Create.*error:|Get.*error:|Review.*error:|Update.*error:|Delete.*error:|Invalid enum|PrismaClient' | tail -30
