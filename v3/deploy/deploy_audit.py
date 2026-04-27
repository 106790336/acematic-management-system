import paramiko
import os

KEY_PATH = r"C:\Users\Kenny\Desktop\workspace\OKR1.pem"
HOST = "43.138.204.20"
USER = "ubuntu"
REMOTE_BACKEND = "/home/ubuntu/acematic/backend-src"
LOCAL_BACKEND = r"C:\Users\Kenny\Desktop\workspace\backend"

# Files to upload
files = [
    ("src/modules/users.ts", "src/modules/users.ts"),
    ("src/modules/departments.ts", "src/modules/departments.ts"),
    ("src/utils/audit.ts", "src/utils/audit.ts"),
]

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
key = paramiko.RSAKey.from_private_key_file(KEY_PATH)
ssh.connect(HOST, username=USER, pkey=key)
sftp = ssh.open_sftp()

print("=== Uploading files ===")
for local_rel, remote_rel in files:
    local_path = os.path.join(LOCAL_BACKEND, local_rel)
    remote_path = os.path.join(REMOTE_BACKEND, remote_rel).replace("\\", "/")
    
    # Ensure remote directory exists
    remote_dir = "/".join(remote_path.split("/")[:-1])
    try:
        sftp.stat(remote_dir)
    except FileNotFoundError:
        stdin, stdout, stderr = ssh.exec_command(f"mkdir -p {remote_dir}")
        stdout.channel.recv_exit_status()
    
    sftp.put(local_path, remote_path)
    print(f"  Uploaded: {local_rel} -> {remote_path}")

sftp.close()

# Restart backend
print("\n=== Restarting backend ===")
stdin, stdout, stderr = ssh.exec_command(
    "cd /home/ubuntu/acematic/backend-src && "
    "pkill -f 'node.*src/index.ts' 2>/dev/null; sleep 1; "
    "nohup npx tsx src/index.ts > /tmp/backend.log 2>&1 & "
    "echo $!"
)
pid = stdout.read().decode().strip()
print(f"  New PID: {pid}")

import time
time.sleep(3)

# Health check
stdin, stdout, stderr = ssh.exec_command("curl -s http://localhost:8080/api/health")
health = stdout.read().decode().strip()
print(f"  Health: {health}")

# Test audit-covered endpoints
stdin, stdout, stderr = ssh.exec_command(
    "curl -s http://localhost:8080/api/users | head -c 200"
)
users_resp = stdout.read().decode().strip()
print(f"  Users API: {users_resp[:100]}...")

stdin, stdout, stderr = ssh.exec_command(
    "curl -s http://localhost:8080/api/departments | head -c 200"
)
depts_resp = stdout.read().decode().strip()
print(f"  Departments API: {depts_resp[:100]}...")

ssh.close()
print("\n=== Done ===")
