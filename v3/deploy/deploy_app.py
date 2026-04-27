import paramiko

KEY_PATH = r"C:\Users\Kenny\Desktop\workspace\OKR1.pem"
HOST = "43.138.204.20"
USER = "ubuntu"
LOCAL = r"C:\Users\Kenny\Desktop\workspace\backend\src\app.ts"
REMOTE = "/home/ubuntu/acematic/backend-src/src/app.ts"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
key = paramiko.RSAKey.from_private_key_file(KEY_PATH)
ssh.connect(HOST, username=USER, pkey=key, timeout=10)

sftp = ssh.open_sftp()
sftp.put(LOCAL, REMOTE)
sftp.close()

# Verify
stdin, stdout, stderr = ssh.exec_command("grep 'audit' /home/ubuntu/acematic/backend-src/src/app.ts", timeout=10)
print(f"Verify: {stdout.read().decode().strip()}")

# Restart
import time
def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=10)
    stdin.close()
    try:
        return stdout.read().decode().strip()
    except:
        return ""

run("fuser -k 3000/tcp 2>/dev/null")
run("pkill -9 -f 'tsx' 2>/dev/null")
time.sleep(2)

transport = ssh.get_transport()
channel = transport.open_session()
channel.settimeout(5)
channel.exec_command("cd /home/ubuntu/acematic/backend-src && nohup npx tsx src/index.ts > /tmp/backend.log 2>&1 &")
time.sleep(5)
channel.close()

ps = run("ps aux | grep 'tsx' | grep -v grep | head -1")
print(f"Process: {ps}")

h = run("curl -s --connect-timeout 3 http://localhost:3000/api/health")
print(f"Health: {h}")

# Test audit-logs endpoint
if "ok" in h:
    login = run('''curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"username":"ceo","password":"123456"}' ''')
    import json
    token = json.loads(login).get("data", {}).get("token", "")
    audit = run(f'''curl -s "http://localhost:3000/api/audit-logs?limit=3" -H "Authorization: Bearer {token}"''')
    print(f"Audit logs: {audit[:400]}")

ssh.close()
print("DONE")
