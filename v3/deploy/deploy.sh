#!/bin/bash
# ACEMATIC V3 快速部署脚本
# 用途: 在腾讯云服务器上重新部署运营管理系统

set -e

echo "=========================================="
echo "ACEMATIC V3 运营管理系统部署"
echo "=========================================="

# 配置变量
DEPLOY_DIR="/opt/acematic-v3"
BACKEND_PORT=3001
FRONTEND_PORT=8080
DOMAIN="43.138.204.20"

# 1. 检查环境
echo "[1/8] 检查环境..."
command -v node >/dev/null 2>&1 || { echo "需要安装Node.js"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "需要安装npm"; exit 1; }
node --version

# 2. 创建部署目录
echo "[2/8] 创建部署目录..."
sudo mkdir -p $DEPLOY_DIR
sudo chown -R $USER:$USER $DEPLOY_DIR

# 3. 复制源码
echo "[3/8] 复制源码..."
# 假设当前目录有源码包
if [ -d "v3" ]; then
    cp -r v3/* $DEPLOY_DIR/
else
    echo "请确保v3目录存在"
    exit 1
fi

cd $DEPLOY_DIR

# 4. 安装后端依赖
echo "[4/8] 安装后端依赖..."
cd backend
npm install --production

# 5. 执行Schema迁移
echo "[5/8] 执行Schema迁移..."
cd prisma
if [ -f "dev.db" ]; then
    echo "数据库已存在，执行增量迁移..."
    sqlite3 dev.db < migrations/migration_phase1.sql
else
    echo "创建新数据库..."
    npx prisma db push
    npx prisma db seed
fi
cd ..

# 6. 构建后端
echo "[6/8] 构建后端..."
npm run build

# 7. 安装并构建前端
echo "[7/8] 构建前端..."
cd ../frontend
npm install
npm run build

# 8. 配置Nginx
echo "[8/8] 配置Nginx..."
sudo tee /etc/nginx/sites-available/acematic > /dev/null << 'NGINX'
server {
    listen 8080;
    server_name 43.138.204.20;

    # 前端静态文件
    location / {
        root /opt/acematic-v3/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # 后端API
    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # 文件上传
    client_max_body_size 50M;
}
NGINX

sudo ln -sf /etc/nginx/sites-available/acematic /etc/nginx/sites-enabled/
sudo nginx -t && sudo nginx -s reload

# 9. 启动后端服务
echo "[9/9] 启动后端服务..."
cd $DEPLOY_DIR/backend

# 使用PM2管理进程
if command -v pm2 >/dev/null 2>&1; then
    pm2 delete acematic-backend 2>/dev/null || true
    pm2 start npm --name "acematic-backend" -- run start
    pm2 save
else
    # 或使用systemd
    sudo tee /etc/systemd/system/acematic.service > /dev/null << 'SYSTEMD'
[Unit]
Description=ACEMATIC V3 Backend
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/acematic-v3/backend
ExecStart=/usr/bin/npm run start
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
SYSTEMD
    sudo systemctl daemon-reload
    sudo systemctl enable acematic
    sudo systemctl restart acematic
fi

echo "=========================================="
echo "✅ 部署完成!"
echo "=========================================="
echo "前端地址: http://$DOMAIN:$FRONTEND_PORT"
echo "后端API:  http://$DOMAIN:$FRONTEND_PORT/api/"
echo ""
echo "默认账号:"
echo "  用户名: admin"
echo "  密码: admin123"
echo ""
echo "查看日志: pm2 logs acematic-backend"
echo "=========================================="
