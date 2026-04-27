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
    except Exception as e:
        return str(e)

# Read local audit-logs.ts
with open(r"C:\Users\Kenny\Desktop\workspace\backend\src\modules\audit-logs.ts", "r", encoding="utf-8") as f:
    content = f.read()

# Write to server via echo (chunked to avoid command length limits)
# First, write to a temp file using cat heredoc
run("rm -f /tmp/audit-logs.ts")

# Split into chunks of ~1000 chars
chunk_size = 800
for i in range(0, len(content), chunk_size):
    chunk = content[i:i+chunk_size]
    # Escape for shell
    chunk = chunk.replace("\\", "\\\\").replace("'", "'\"'\"'").replace("\n", "\\n")
    cmd = f"echo -n '{chunk}' >> /tmp/audit-logs.ts"
    run(cmd)

# Copy to final location
run("cp /tmp/audit-logs.ts /home/ubuntu/acematic/backend-src/src/modules/audit-logs.ts")

# Verify
verify = run("head -20 /home/ubuntu/acematic/backend-src/src/modules/audit-logs.ts")
print(f"Verify audit-logs.ts: {verify[:200]}")

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

# Test
login = run('''curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"username":"ceo","password":"123456"}' ''')
try:
    token = json.loads(login).get("data", {}).get("token", "")
    audit = run(f'''curl -s "http://localhost:3000/api/audit-logs?limit=3" -H "Authorization: Bearer {token}"''')
    print(f"Audit logs response: {audit[:500]}")
except Exception as e:
    print(f"Error: {e}")
    print(f"Login response: {login[:200]}")

ssh.close()
print("DONE")
