import paramiko
import time

KEY_PATH = r"C:\Users\Kenny\Desktop\workspace\OKR1.pem"
HOST = "43.138.204.20"
USER = "ubuntu"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
key = paramiko.RSAKey.from_private_key_file(KEY_PATH)
ssh.connect(HOST, username=USER, pkey=key)

# Check if old processes exist and kill them
print("=== Killing old processes ===")
stdin, stdout, stderr = ssh.exec_command("ps aux | grep -E 'node|tsx' | grep -v grep")
print(stdout.read().decode())

stdin, stdout, stderr = ssh.exec_command("pkill -9 -f 'tsx' 2>/dev/null; pkill -9 -f 'node.*index' 2>/dev/null; sleep 1; echo 'Killed'")
print(stdout.read().decode().strip())

# Check PORT in .env
print("\n=== .env PORT ===")
stdin, stdout, stderr = ssh.exec_command("grep PORT /home/ubuntu/acematic/backend-src/.env")
print(stdout.read().decode().strip())

# Start fresh
print("\n=== Starting backend ===")
stdin, stdout, stderr = ssh.exec_command(
    "cd /home/ubuntu/acematic/backend-src && "
    "export NODE_ENV=production && "
    "nohup npx tsx src/index.ts > /tmp/backend.log 2>&1 & "
    "sleep 4 && "
    "echo 'PID:' && ps aux | grep 'tsx src/index' | grep -v grep && "
    "echo '--- Last 30 lines of log ---' && "
    "tail -30 /tmp/backend.log"
)
print(stdout.read().decode())
err = stderr.read().decode()
if err:
    print("STDERR:", err)

# Health check
stdin, stdout, stderr = ssh.exec_command("curl -s http://localhost:8080/api/health 2>&1")
health = stdout.read().decode().strip()
print(f"\nHealth (8080): {health}")

stdin, stdout, stderr = ssh.exec_command("curl -s http://localhost:3000/api/health 2>&1")
health2 = stdout.read().decode().strip()
print(f"Health (3000): {health2}")

ssh.close()
