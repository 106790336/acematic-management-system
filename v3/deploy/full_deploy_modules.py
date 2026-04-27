import paramiko, time, os

KEY_PATH = r"C:\Users\Kenny\Desktop\workspace\OKR1.pem"
HOST = "43.138.204.20"
USER = "ubuntu"
LOCAL_MODULES = r"C:\Users\Kenny\Desktop\workspace\backend\src\modules"
REMOTE_MODULES = "/home/ubuntu/acematic/backend-src/src/modules"

# All modules that might be missing on server
MISSING_MODULES = [
    "audit-logs.ts",
    "system-version.ts",
    "backup.ts",
    "health.ts",
]

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
key = paramiko.RSAKey.from_private_key_file(KEY_PATH)
ssh.connect(HOST, username=USER, pkey=key, timeout=10)
sftp = ssh.open_sftp()

for fname in MISSING_MODULES:
    local = os.path.join(LOCAL_MODULES, fname)
    remote = f"{REMOTE_MODULES}/{fname}"
    if os.path.exists(local):
        sftp.put(local, remote)
        print(f"Uploaded: {fname}")
    else:
        print(f"Not found locally: {fname}")

sftp.close()

# Check what modules exist on server
stdin, stdout, stderr = ssh.exec_command(f"ls {REMOTE_MODULES}/", timeout=10)
print(f"\nServer modules: {stdout.read().decode().strip()}")

# Restart
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

h = run("curl -s --connect-timeout 3 http://localhost:3000/api/health")
print(f"Health: {h}")

if "ok" in h:
    import json
    login = run('''curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"username":"ceo","password":"123456"}' ''')
    token = json.loads(login).get("data", {}).get("token", "")
    
    # Create + update + delete department to generate audit logs
    d = run(f'''curl -s -X POST http://localhost:3000/api/departments -H "Content-Type: application/json" -H "Authorization: Bearer {token}" -d '{{"name":"TestDept2"}}' ''')
    print(f"Create dept: {d[:150]}")
    
    if '"id"' in d:
        did = json.loads(d).get("data",{}).get("id","")
        run(f'''curl -s -X PUT http://localhost:3000/api/departments/{did} -H "Content-Type: application/json" -H "Authorization: Bearer {token}" -d '{{"name":"TestDept2Updated"}}' ''')
        run(f'''curl -s -X DELETE http://localhost:3000/api/departments/{did} -H "Authorization: Bearer {token}"''')
        print("Update + delete done")
    
    audit = run(f'''curl -s "http://localhost:3000/api/audit-logs?limit=5" -H "Authorization: Bearer {token}"''')
    print(f"\nAudit logs: {audit[:500]}")
else:
    log = run("tail -20 /tmp/backend.log")
    print(f"Log: {log}")

ssh.close()
print("\nDONE")

