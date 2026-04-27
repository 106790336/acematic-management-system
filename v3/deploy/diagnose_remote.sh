#!/bin/bash
# 服务器部署诊断脚本
# 用于排查 http://43.138.204.20:8080/ 无法访问的问题

echo "=========================================="
echo "ACEMATIC V3 服务诊断"
echo "=========================================="

TARGET_IP="43.138.204.20"
TARGET_PORT="8080"
BACKEND_PORT="3001"

# 1. 检查服务器可达性
echo ""
echo "[1] 检查服务器网络连通性..."
ping -c 3 $TARGET_IP || echo "⚠️ 服务器无法ping通（可能禁用了ICMP）"

# 2. 检查端口开放
echo ""
echo "[2] 检查端口开放..."
nc -zv -w5 $TARGET_IP $TARGET_PORT 2>&1 || echo "❌ 端口8080不可访问"
nc -zv -w5 $TARGET_IP $BACKEND_PORT 2>&1 || echo "⚠️ 后端端口3001状态未知"

# 3. 如果SSH可连接，检查服务状态
echo ""
echo "[3] SSH连接检查（需要密码）..."
ssh -o ConnectTimeout=10 root@$TARGET_IP "echo '✅ SSH可连接'" 2>&1 || echo "❌ SSH无法连接"

# 4. 可能的原因
echo ""
echo "=========================================="
echo "可能原因:"
echo "=========================================="
echo ""
echo "1. 腾讯云安全组未开放8080端口"
echo "   → 解决: 登录腾讯云控制台，添加安全组规则"
echo ""
echo "2. Nginx服务未运行"
echo "   → 解决: ssh登录后执行 systemctl status nginx"
echo ""
echo "3. 后端服务崩溃"
echo "   → 解决: ssh登录后执行 pm2 logs 或 journalctl -u acematic"
echo ""
echo "4. 防火墙阻止"
echo "   → 解决: ssh登录后执行 iptables -L -n"
echo ""
echo "=========================================="

# 5. 如果有SSH权限，提供远程检查命令
echo "远程诊断命令（SSH登录后执行）:"
echo "----------------------------------------"
echo "# 检查Nginx"
echo "systemctl status nginx"
echo "nginx -t"
echo ""
echo "# 检查后端进程"
echo "pm2 list"
echo "pm2 logs acematic-backend --lines 50"
echo ""
echo "# 检查端口占用"
echo "netstat -tlnp | grep -E '8080|3001'"
echo ""
echo "# 检查防火墙"
echo "iptables -L -n"
echo "ufw status"
echo ""
echo "# 重启服务"
echo "systemctl restart nginx"
echo "pm2 restart acematic-backend"
echo "----------------------------------------"