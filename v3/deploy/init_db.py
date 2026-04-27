import paramiko
import json

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

# 如果后端运行，重置数据库
if "not running" not in health:
    print("\n=== Resetting database ===")
    
    # 停止后端
    client.exec_command('pkill -f "tsx watch" || true')
    client.exec_command('sleep 2')
    
    # 删除旧数据库
    cmd = 'cd /home/ubuntu/acematic/backend-src && rm -f prisma/dev.db && echo "DB deleted"'
    stdin, stdout, stderr = client.exec_command(cmd)
    print("Delete DB:", stdout.read().decode().strip())
    
    # 重新生成 Prisma 客户端并迁移
    cmd = 'cd /home/ubuntu/acematic/backend-src && npx prisma generate 2>&1 | tail -5'
    stdin, stdout, stderr = client.exec_command(cmd)
    print("Prisma generate:", stdout.read().decode().strip())
    
    cmd = 'cd /home/ubuntu/acematic/backend-src && npx prisma db push --accept-data-loss 2>&1 | tail -10'
    stdin, stdout, stderr = client.exec_command(cmd)
    print("Prisma db push:", stdout.read().decode().strip())
    
    # 运行 seed
    cmd = 'cd /home/ubuntu/acematic/backend-src && npx tsx prisma/seed.ts 2>&1'
    stdin, stdout, stderr = client.exec_command(cmd)
    seed_output = stdout.read().decode()
    print("Seed output:", seed_output[-500:] if len(seed_output) > 500 else seed_output)
    
    # 重启后端
    client.exec_command('cd /home/ubuntu/acematic/backend-src && nohup npx tsx watch src/index.ts > backend.log 2>&1 &')
    client.exec_command('sleep 3')
    
    # 检查后端是否启动
    stdin, stdout, stderr = client.exec_command('curl -s http://127.0.0.1:3000/api/health 2>/dev/null || echo "Still not running"')
    print("Backend after restart:", stdout.read().decode().strip())

client.close()
print("\n=== Database initialization complete ===")
