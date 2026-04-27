import paramiko

key_path = r"C:\Users\Kenny\Desktop\workspace\OKR1.pem"
host = "43.138.204.20"
username = "ubuntu"

pkey = paramiko.RSAKey.from_private_key_file(key_path)
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(hostname=host, username=username, pkey=pkey)

# 检查后端状态
stdin, stdout, stderr = client.exec_command('curl -s http://127.0.0.1:3000/api/health 2>/dev/null || echo "Backend not running"')
health = stdout.read().decode().strip()
print("Backend health:", health)

# 停止后端
print("\n=== Stopping backend ===")
client.exec_command('pkill -f "tsx watch" 2>/dev/null || true')
import time
time.sleep(2)

# 删除旧数据库
print("\n=== Deleting old database ===")
cmd = 'cd /home/ubuntu/acematic/backend-src && rm -f prisma/dev.db && echo "DB deleted"'
stdin, stdout, stderr = client.exec_command(cmd)
print("Result:", stdout.read().decode().strip())

# 重新生成 Prisma 客户端
print("\n=== Generating Prisma client ===")
cmd = 'cd /home/ubuntu/acematic/backend-src && npx prisma generate 2>&1 | grep -E "(error|Error|success|generated)" || echo "Done"'
stdin, stdout, stderr = client.exec_command(cmd)
print("Result:", stdout.read().decode().strip()[-200:])

# 数据库迁移
print("\n=== Pushing database schema ===")
cmd = 'cd /home/ubuntu/acematic/backend-src && npx prisma db push --accept-data-loss 2>&1 | grep -v "^\\s*$" | tail -10'
stdin, stdout, stderr = client.exec_command(cmd)
print("Result:", stdout.read().decode().strip()[-300:])

# 运行 seed
print("\n=== Running database seed ===")
cmd = 'cd /home/ubuntu/acematic/backend-src && npx tsx prisma/seed.ts 2>&1'
stdin, stdout, stderr = client.exec_command(cmd)
seed_out = stdout.read().decode()
seed_err = stderr.read().decode()
if "error" in seed_out.lower() or seed_err:
    print("Seed errors:", seed_err[-300:] if seed_err else "None")
print("Seed output (last 500 chars):", seed_out[-500:] if len(seed_out) > 500 else seed_out)

# 重启后端
print("\n=== Restarting backend ===")
cmd = 'cd /home/ubuntu/acematic/backend-src && nohup npx tsx watch src/index.ts > backend.log 2>&1 &'
client.exec_command(cmd)
time.sleep(3)

# 检查后端状态
stdin, stdout, stderr = client.exec_command('curl -s http://127.0.0.1:3000/api/health')
print("Backend status:", stdout.read().decode().strip())

# 检查登录API
print("\n=== Testing login API ===")
stdin, stdout, stderr = client.exec_command('curl -s -X POST http://127.0.0.1:3000/api/auth/login -H "Content-Type: application/json" -d \'{"username":"ceo","password":"123456"}\' 2>&1')
login_res = stdout.read().decode().strip()
print("Login test:", login_res[:200] if len(login_res) > 200 else login_res)

client.close()
print("\n=== Database initialization complete ===")
