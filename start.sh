#!/bin/bash

# ============================================
# 快速开始脚本 - 本地运行
# ============================================

echo "🚀 启动运营管理系统（本地开发模式）..."

# 检查依赖
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3未安装"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ Node.js未安装"
    exit 1
fi

# 安装后端依赖
echo "📦 安装后端依赖..."
cd backend
pip3 install -r requirements.txt

# 启动后端
echo "🔧 启动后端服务..."
python3 app.py &
BACKEND_PID=$!

# 等待后端启动
sleep 3

# 安装前端依赖
echo "📦 安装前端依赖..."
cd ../frontend
npm install

# 启动前端
echo "🎨 启动前端服务..."
npm run dev

# 清理
kill $BACKEND_PID 2>/dev/null
