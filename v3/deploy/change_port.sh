#!/bin/bash
# 更换后端端口为 8080，避免与现有应用冲突

# 1. 停止现有后端
pkill -f "tsx.*index.ts" || true
sleep 2

# 2. 修改环境变量
sed -i 's/PORT=3000/PORT=8080/' /home/ubuntu/acematic/backend-src/.env

# 3. 启动后端在新端口
cd /home/ubuntu/acematic/backend-src
nohup npx tsx watch src/index.ts > /tmp/backend.log 2>&1 &
sleep 3

# 4. 更新 nginx 配置
sudo tee /etc/nginx/sites-enabled/acematic > /dev/null << 'EOF'
server {
    listen 80;
    server_name 43.138.204.20;

    # 禁用缓存
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";

    location /api {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_buffering off;
        proxy_request_buffering off;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location / {
        root /home/ubuntu/acematic/frontend/dist;
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
}
EOF

# 5. 测试并重载 nginx
sudo nginx -t && sudo nginx -s reload

# 6. 验证
sleep 2
echo "测试新端口..."
curl -s -X POST -H "Content-Type: application/json" -d '{"username":"ceo","password":"123456"}' http://43.138.204.20/api/auth/login | head -c 100
echo ""
