import paramiko, time, os, json

KEY_PATH = r"C:\Users\Kenny\Desktop\workspace\OKR1.pem"
HOST = "43.138.204.20"
USER = "ubuntu"
LOCAL = r"C:\Users\Kenny\Desktop\workspace\backend\src"
REMOTE = "/home/ubuntu/acematic/backend-src/src"

FILES = [
    ("modules/system-version.ts", "modules/system-version.ts"),
    ("modules/audit-logs.ts", "modules/audit-logs.ts"),
    ("modules/backup.ts", "modules/backup.ts"),
    ("modules/health.ts", "modules/health.ts"),
    ("app.ts", "app.ts"),
]

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
key = paramiko.RSAKey.from_private_key_file(KEY_PATH)
ssh.connect(HOST, username=USER, pkey=key, timeout=10)
sftp = ssh.open_sftp()

for local_rel, remote_rel in FILES:
    lp = os.path.join(LOCAL, local_rel)
    rp = f"{REMOTE}/{remote_rel}"
    sftp.put(lp, rp)
    print(f"Uploaded: {local_rel}")

sftp.close()

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=10)
    stdin.close()
    try:
        return stdout.read().decode().strip()
    except:
        return ""

# Kill and restart
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

if "ok" not in h:
    log = run("tail -20 /tmp/backend.log")
    print(f"ERROR LOG: {log}")
    ssh.close()
    exit(1)

# Login
login = run('''curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"username":"ceo","password":"123456"}' ''')
token = json.loads(login).get("data", {}).get("token", "")
print(f"Token: {token[:30]}...")

# Test department CRUD (generates audit logs)
d = run(f'''curl -s -X POST http://localhost:3000/api/departments -H "Content-Type: application/json" -H "Authorization: Bearer {token}" -d '{{"name":"FinalTestDept"}}' ''')
print(f"Create dept: {d[:150]}")

if '"id"' in d:
    did = json.loads(d).get("data",{}).get("id","")
    u = run(f'''curl -s -X PUT http://localhost:3000/api/departments/{did} -H "Content-Type: application/json" -H "Authorization: Bearer {token}" -d '{{"name":"FinalTestDeptRenamed"}}' ''')
    print(f"Update dept: {u[:100]}")
    
    r = run(f'''curl -s -X DELETE http://localhost:3000/api/departments/{did} -H "Authorization: Bearer {token}"''')
    print(f"Delete dept: {r[:100]}")

# Check audit logs
audit = run(f'''curl -s "http://localhost:3000/api/audit-logs?limit=5" -H "Authorization: Bearer {token}"''')
print(f"\nAudit logs: {audit[:600]}")

ssh.close()
print("\nDONE")
