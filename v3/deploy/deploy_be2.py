import paramiko
import os

key_path = r"C:\Users\Kenny\Desktop\workspace\OKR1.pem"
host = "43.138.204.20"
username = "ubuntu"
backend_dir = r"C:\Users\Kenny\Desktop\workspace\backend"
remote_dir = "/home/ubuntu/acematic/backend-src"

pkey = paramiko.RSAKey.from_private_key_file(key_path)
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(hostname=host, username=username, pkey=pkey)

# 创建 utils 目录
client.exec_command(f'mkdir -p {remote_dir}/src/utils')

sftp = client.open_sftp()

# 上传修改的文件
files_to_upload = [
    ("src/modules/plans.ts", f"{remote_dir}/src/modules/plans.ts"),
    ("src/modules/tasks.ts", f"{remote_dir}/src/modules/tasks.ts"),
    ("src/utils/audit.ts", f"{remote_dir}/src/utils/audit.ts"),
]

for local, remote in files_to_upload:
    local_path = os.path.join(backend_dir, local)
    if os.path.exists(local_path):
        print(f"Uploading {local}...")
        sftp.put(local_path, remote)
    else:
        print(f"Warning: {local_path} not found")

sftp.close()

# 重启后端
print("\nRestarting backend...")
client.exec_command('pkill -f "tsx watch" 2>/dev/null || true')
import time
time.sleep(2)

client.exec_command(f'cd {remote_dir} && nohup npx tsx watch src/index.ts > backend.log 2>&1 &')
time.sleep(3)

# 检查状态
stdin, stdout, stderr = client.exec_command('curl -s http://127.0.0.1:3000/api/health')
health = stdout.read().decode().strip()
print("Backend health:", health)

client.close()
print("\n=== Deploy complete ===")
