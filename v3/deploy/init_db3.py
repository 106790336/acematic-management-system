# -*- coding: utf-8 -*-
import paramiko
import sys

# 设置编码
sys.stdout.reconfigure(encoding='utf-8')

key_path = r"C:\Users\Kenny\Desktop\workspace\OKR1.pem"
host = "43.138.204.20"
username = "ubuntu"

pkey = paramiko.RSAKey.from_private_key_file(key_path)
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(hostname=host, username=username, pkey=pkey)

def run_cmd(cmd, desc):
    print(f"\n=== {desc} ===")
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='ignore')
    err = stderr.read().decode('utf-8', errors='ignore')
    if err and "warn" not in err.lower():
        print(f"Error: {err[:200]}")
    return out

# 停止后端
run_cmd('pkill -f "tsx watch" 2>/dev/null || true', "Stopping backend")
import time
time.sleep(2)

# 删除旧数据库
run_cmd('cd /home/ubuntu/acematic/backend-src && rm -f prisma/dev.db', "Deleting old database")

# 重新生成 Prisma 客户端
run_cmd('cd /home/ubuntu/acematic/backend-src && npx prisma generate 2>&1', "Generating Prisma client")

# 数据库迁移
out = run_cmd('cd /home/ubuntu/acematic/backend-src && npx prisma db push --accept-data-loss 2>&1', "Pushing database schema")
print(out[-400:])

# 运行 seed
out = run_cmd('cd /home/ubuntu/acematic/backend-src && npx tsx prisma/seed.ts 2>&1', "Running database seed")
print(out[-500:])

# 重启后端
run_cmd('cd /home/ubuntu/acematic/backend-src && nohup npx tsx watch src/index.ts > backend.log 2>&1 &', "Restarting backend")
time.sleep(3)

# 检查后端状态
out = run_cmd('curl -s http://127.0.0.1:3000/api/health', "Checking backend health")
print("Health:", out)

# 测试登录
out = run_cmd('curl -s -X POST http://127.0.0.1:3000/api/auth/login -H "Content-Type: application/json" -d \'{"username":"ceo","password":"123456"}\' 2>&1', "Testing login")
print("Login response:", out[:300])

client.close()
print("\n=== Database initialization complete ===")
