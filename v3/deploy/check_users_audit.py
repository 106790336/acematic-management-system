import paramiko, json, time

KEY_PATH = r"C:\Users\Kenny\Desktop\workspace\OKR1.pem"
HOST = "43.138.204.20"
USER = "ubuntu"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
key = paramiko.RSAKey.from_private_key_file(KEY_PATH)
ssh.connect(HOST, username=USER, pkey=key, timeout=10)

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=15)
    stdin.close()
    try:
        out = stdout.read().decode().strip()
        err = stderr.read().decode().strip()
        return out + (f"\n{err}" if err else "")
    except:
        return ""

# Check if users.ts has audit imports
result = run("grep -c 'auditCreate\|auditUpdate\|auditDelete' /home/ubuntu/acematic/backend-src/src/modules/users.ts")
print(f"Audit calls in users.ts: {result}")

# Test login and create a user to verify audit log
login = run('''curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"username":"ceo","password":"123456"}' ''')
try:
    token = json.loads(login).get("data", {}).get("token", "")
    print(f"Login success, token length: {len(token)}")
except:
    print(f"Login failed: {login[:200]}")
    token = ""

if token:
    # Create a test user
    create = run(f'''curl -s -X POST http://localhost:3000/api/users -H "Content-Type: application/json" -H "Authorization: Bearer {token}" -d '{{"username":"testuser{int(time.time())%1000}","password":"123456","name":"Test User","role":"employee"}}' ''')
    print(f"Create user: {create[:300]}")
    
    # Check audit logs
    audit = run(f'''curl -s "http://localhost:3000/api/audit-logs?limit=3" -H "Authorization: Bearer {token}"''')
    print(f"Audit logs: {audit[:500]}")

ssh.close()
print("DONE")
