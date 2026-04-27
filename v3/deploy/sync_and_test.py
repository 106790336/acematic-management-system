import paramiko, json, time

KEY_PATH = r"C:\Users\Kenny\Desktop\workspace\OKR1.pem"
HOST = "43.138.204.20"
USER = "ubuntu"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
key = paramiko.RSAKey.from_private_key_file(KEY_PATH)
ssh.connect(HOST, username=USER, pkey=key, timeout=10)

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
    stdin.close()
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out + (f"\n{err}" if err else "")

# Use Prisma Studio or direct query via npx prisma
# Let's try prisma db push to ensure schema synced
print("Syncing Prisma schema...")
push = run("cd /home/ubuntu/acematic/backend-src && npx prisma db push --accept-data-loss 2>&1")
print(f"Prisma db push:\n{push[:800]}")

# Generate Prisma client
print("\nGenerating Prisma client...")
gen = run("cd /home/ubuntu/acematic/backend-src && npx prisma generate 2>&1")
print(f"Prisma generate: {gen[:300]}")

# Restart backend
print("\nRestarting backend...")
run("pkill -9 -f 'tsx' 2>/dev/null")
time.sleep(2)

transport = ssh.get_transport()
channel = transport.open_session()
channel.exec_command("cd /home/ubuntu/acematic/backend-src && nohup npx tsx src/index.ts > /tmp/backend.log 2>&1 &")
time.sleep(8)
channel.close()

# Test
health = run("curl -s http://localhost:3000/api/health")
print(f"\nHealth: {health}")

if "ok" in health:
    login = run('''curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"username":"ceo","password":"123456"}' ''')
    token = ""
    try:
        token = json.loads(login).get("data", {}).get("token", "")
    except:
        pass
    if token:
        print("Login: OK")
        audit = run(f'''curl -s "http://localhost:3000/api/audit-logs?limit=3" -H "Authorization: Bearer {token}"''')
        print(f"Audit logs: {audit[:300]}")
    else:
        print(f"Login failed: {login[:200]}")
else:
    log = run("tail -20 /tmp/backend.log")
    print(f"Backend log:\n{log}")

ssh.close()
print("\nDONE")