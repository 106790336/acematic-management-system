import paramiko, time

KEY_PATH = r"C:\Users\Kenny\Desktop\workspace\OKR1.pem"
HOST = "43.138.204.20"
USER = "ubuntu"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
key = paramiko.RSAKey.from_private_key_file(KEY_PATH)
ssh.connect(HOST, username=USER, pkey=key, timeout=10)

# Upload schema
sftp = ssh.open_sftp()
sftp.put(r"C:\Users\Kenny\Desktop\workspace\backend\prisma\schema.prisma", 
         "/home/ubuntu/acematic/backend-src/prisma/schema.prisma")
sftp.close()
print("Schema uploaded")

# Run prisma db push
def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
    stdin.close()
    try:
        out = stdout.read().decode().strip()
        err = stderr.read().decode().strip()
        return out + (f"\n{err}" if err else "")
    except:
        return ""

result = run("cd /home/ubuntu/acematic/backend-src && npx prisma db push --accept-data-loss 2>&1")
print(f"Prisma push: {result[-500:]}")

# Regenerate client
result2 = run("cd /home/ubuntu/acematic/backend-src && npx prisma generate 2>&1")
print(f"Prisma generate: {result2[-300:]}")

# Restart backend
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
    audit = run(f'''curl -s "http://localhost:3000/api/audit-logs?limit=3" -H "Authorization: Bearer {token}"''')
    print(f"Audit logs: {audit[:500]}")
else:
    log = run("tail -20 /tmp/backend.log")
    print(f"ERROR: {log}")

ssh.close()
print("DONE")
