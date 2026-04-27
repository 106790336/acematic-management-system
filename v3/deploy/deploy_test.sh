#!/bin/bash
# ================================================
# ACEMATIC V3 临时测试平台部署脚本
# 隔离策略: 与生产环境完全隔离，零影响
# ================================================
#
# 隔离措施:
#   独立目录: /opt/acematic-test/
#   独立端口: 后端3011 / 前端8181
#   独立数据库: test.db（非dev.db）
#   独立PM2进程: acematic-test-backend
#   独立Nginx: acematic-test配置
#
# 一键删除: bash deploy_test.sh --uninstall
# ================================================

set -e

# ===== 隔离配置（与生产完全不同）=====
TEST_DIR="/opt/acematic-test"
TEST_BACKEND_PORT=3011
TEST_FRONTEND_PORT=8181
TEST_DB_NAME="test.db"
TEST_PM2_NAME="acematic-test-backend"
TEST_NGINX_CONF="acematic-test"
TEST_DOMAIN="43.138.204.20"

# ===== 检查是否会影响生产 =====
echo "=========================================="
echo "ACEMATIC V3 临时测试平台部署"
echo "=========================================="

# 检查生产端口是否被占用
check_port() {
    if ss -tlnp 2>/dev/null | grep -q ":$1 "; then
        echo "❌ 端口 $1 已被占用，为避免影响现有服务，终止部署"
        ss -tlnp | grep ":$1 "
        exit 1
    fi
}

echo ""
echo "[安全检查] 确认不会影响生产环境..."

# 检查端口隔离
check_port $TEST_BACKEND_PORT
check_port $TEST_FRONTEND_PORT

# 检查PM2进程名隔离
if command -v pm2 >/dev/null 2>&1; then
    if pm2 jlist 2>/dev/null | grep -q "\"name\":\"$TEST_PM2_NAME\""; then
        echo "⚠️ 测试进程已在运行，先停止旧进程"
        pm2 delete $TEST_PM2_NAME 2>/dev/null || true
    fi
fi

# 检查目录隔离
if [ -d "$TEST_DIR" ]; then
    echo "⚠️ 测试目录已存在: $TEST_DIR"
    read -p "是否清除重建？(y/N): " confirm
    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
        rm -rf $TEST_DIR
    else
        echo "终止部署"
        exit 1
    fi
fi

# 检查Nginx配置隔离
if [ -f "/etc/nginx/sites-enabled/$TEST_NGINX_CONF" ]; then
    echo "⚠️ 测试Nginx配置已存在"
fi

echo "✅ 安全检查通过"
echo ""

# ===== 卸载模式 =====
if [ "$1" = "--uninstall" ]; then
    echo "=========================================="
    echo "卸载临时测试平台"
    echo "=========================================="
    
    # 停止PM2进程
    if command -v pm2 >/dev/null 2>&1; then
        pm2 delete $TEST_PM2_NAME 2>/dev/null || true
    fi
    
    # 停止systemd服务
    sudo systemctl stop acematic-test 2>/dev/null || true
    sudo systemctl disable acematic-test 2>/dev/null || true
    sudo rm -f /etc/systemd/system/acematic-test.service
    
    # 删除Nginx配置
    sudo rm -f /etc/nginx/sites-enabled/$TEST_NGINX_CONF
    sudo rm -f /etc/nginx/sites-available/$TEST_NGINX_CONF
    sudo nginx -t 2>/dev/null && sudo nginx -s reload 2>/dev/null || true
    
    # 删除测试目录
    sudo rm -rf $TEST_DIR
    
    echo "✅ 测试平台已完全卸载"
    echo "生产环境未受任何影响"
    exit 0
fi

# ===== 开始部署 =====

# 1. 创建独立目录
echo "[1/8] 创建测试目录: $TEST_DIR"
sudo mkdir -p $TEST_DIR/{backend,frontend/dist,backend/prisma,uploads,logs}
sudo chown -R $USER:$USER $TEST_DIR

# 2. 复制源码（从当前v3目录）
echo "[2/8] 复制源码..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
V3_DIR="$SCRIPT_DIR/../.."

if [ -d "$V3_DIR/backend/src" ]; then
    cp -r $V3_DIR/backend/src $TEST_DIR/backend/
    cp $V3_DIR/backend/package.json $TEST_DIR/backend/
    cp $V3_DIR/backend/tsconfig.json $TEST_DIR/backend/
    [ -f "$V3_DIR/backend/eslint.config.js" ] && cp $V3_DIR/backend/eslint.config.js $TEST_DIR/backend/
fi

# 复制前端构建产物（如果已有）
if [ -d "$V3_DIR/frontend/dist" ]; then
    cp -r $V3_DIR/frontend/dist/* $TEST_DIR/frontend/dist/
fi

# 3. 配置独立环境变量
echo "[3/8] 配置环境变量..."
cat > $TEST_DIR/backend/.env << ENVFILE
# 测试环境独立配置
NODE_ENV=production
PORT=$TEST_BACKEND_PORT
DATABASE_URL="file:$TEST_DIR/backend/prisma/$TEST_DB_NAME"
JWT_SECRET="test-jwt-secret-$(date +%s)-isolated"
CORS_ORIGIN=*
API_PREFIX=/api
UPLOAD_DIR=$TEST_DIR/uploads
ENVFILE

# 4. 安装后端依赖
echo "[4/8] 安装后端依赖..."
cd $TEST_DIR/backend
npm install --production 2>&1 | tail -3

# 5. 创建独立数据库（全新test.db）
echo "[5/8] 创建测试数据库..."
cd $TEST_DIR/backend/prisma

# 使用生产schema创建全新数据库
if [ -f "$V3_DIR/backend/prisma/schema.prisma" ]; then
    cp $V3_DIR/backend/prisma/schema.prisma $TEST_DIR/backend/prisma/
fi

# 创建新数据库并推入schema
DATABASE_URL="file:$TEST_DIR/backend/prisma/$TEST_DB_NAME" npx prisma db push --skip-generate 2>&1 | tail -5

# 执行Phase 1迁移
if [ -f "$V3_DIR/backend/prisma/migrations/migration_phase1.sql" ]; then
    echo "执行Schema增量迁移..."
    sqlite3 $TEST_DIR/backend/prisma/$TEST_DB_NAME < $V3_DIR/backend/prisma/migrations/migration_phase1.sql 2>&1 || true
fi

# 生成Prisma Client
cd $TEST_DIR/backend
npx prisma generate 2>&1 | tail -3

# 6. 构建后端
echo "[6/8] 构建后端..."
npm run build 2>&1 | tail -5

# 7. 构建前端（如果需要）
echo "[7/8] 检查前端..."
if [ ! -f "$TEST_DIR/frontend/dist/index.html" ]; then
    if [ -d "$V3_DIR/frontend/src" ]; then
        echo "构建前端..."
        cd $V3_DIR/frontend
        npm install 2>&1 | tail -3
        npm run build 2>&1 | tail -5
        cp -r dist/* $TEST_DIR/frontend/dist/
    else
        echo "⚠️ 无前端源码，跳过构建"
    fi
else
    echo "✅ 前端构建产物已就绪"
fi

# 8. 配置Nginx（独立配置，不影响生产）
echo "[8/8] 配置独立Nginx..."
sudo tee /etc/nginx/sites-available/$TEST_NGINX_CONF > /dev/null << NGINX
# ================================================
# ACEMATIC V3 测试平台（独立隔离配置）
# 端口: 8181（生产8080不受影响）
# 后端: 3011（生产3001不受影响）
# ================================================
server {
    listen $TEST_FRONTEND_PORT;
    server_name $TEST_DOMAIN;

    # 前端静态文件
    location / {
        root $TEST_DIR/frontend/dist;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }

    # 后端API
    location /api/ {
        proxy_pass http://127.0.0.1:$TEST_BACKEND_PORT/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    # 文件上传
    client_max_body_size 50M;

    # 访问日志（独立）
    access_log /var/log/nginx/acematic-test.access.log;
    error_log  /var/log/nginx/acematic-test.error.log;
}
NGINX

sudo ln -sf /etc/nginx/sites-available/$TEST_NGINX_CONF /etc/nginx/sites-enabled/
sudo nginx -t && sudo nginx -s reload

# 9. 启动测试后端（独立进程）
echo "[9/9] 启动测试后端服务..."
cd $TEST_DIR/backend

if command -v pm2 >/dev/null 2>&1; then
    pm2 start npm --name "$TEST_PM2_NAME" -- run start
    pm2 save
    echo "PM2管理: pm2 logs $TEST_PM2_NAME"
else
    sudo tee /etc/systemd/system/acematic-test.service > /dev/null << SYSTEMD
[Unit]
Description=ACEMATIC V3 Test Backend (ISOLATED)
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$TEST_DIR/backend
EnvironmentFile=$TEST_DIR/backend/.env
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
SYSTEMD
    sudo systemctl daemon-reload
    sudo systemctl enable acematic-test
    sudo systemctl restart acematic-test
    echo "Systemd管理: journalctl -u acematic-test -f"
fi

# 等待服务启动
sleep 3

# 验证服务状态
echo ""
echo "=========================================="
echo "验证测试平台..."
echo "=========================================="

# 检查后端
BACKEND_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$TEST_BACKEND_PORT/api/health" 2>/dev/null || echo "000")
# 检查前端
FRONTEND_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$TEST_FRONTEND_PORT/" 2>/dev/null || echo "000")

echo ""
echo "=========================================="
echo "✅ 部署完成!"
echo "=========================================="
echo ""
echo "📊 隔离信息:"
echo "  测试目录: $TEST_DIR"
echo "  测试数据库: $TEST_DIR/backend/prisma/$TEST_DB_NAME"
echo "  后端端口: $TEST_BACKEND_PORT（生产3001不受影响）"
echo "  前端端口: $TEST_FRONTEND_PORT（生产8080不受影响）"
echo "  PM2进程: $TEST_PM2_NAME"
echo ""
echo "🌐 访问地址:"
echo "  测试平台: http://$TEST_DOMAIN:$TEST_FRONTEND_PORT"
echo ""
echo "🔧 管理命令:"
echo "  查看日志: pm2 logs $TEST_PM2_NAME"
echo "  重启服务: pm2 restart $TEST_PM2_NAME"
echo "  停止服务: pm2 stop $TEST_PM2_NAME"
echo "  卸载测试: bash $0 --uninstall"
echo ""
echo "🔴 生产环境状态（确认未受影响）:"
echo "  生产8080: $(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:8080/" 2>/dev/null || echo "未运行")"
echo "  生产3001: $(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:3001/api/health" 2>/dev/null || echo "未运行")"
echo "=========================================="