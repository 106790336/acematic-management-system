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
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out + (f"\n{err}" if err else "")

# Kill existing backend
print("Killing old processes...")
run("pkill -9 -f 'tsx' 2>/dev/null")
run("fuser -k 3000/tcp 2>/dev/null")
time.sleep(2)

# Start backend in background
print("Starting backend...")
transport = ssh.get_transport()
channel = transport.open_session()
channel.settimeout(5)
channel.exec_command("cd /home/ubuntu/acematic/backend-src && nohup npx tsx src/index.ts > /tmp/backend.log 2>&1 &")
time.sleep(8)
channel.close()

# Check if running
ps = run("ps aux | grep tsx | grep -v grep")
print(f"Process: {ps or 'NOT RUNNING'}")

# Check port
port = run("ss -tlnp | grep 3000")
print(f"Port 3000: {port or 'NOT LISTENING'}")

# Health check
health = run("curl -s --connect-timeout 3 http://localhost:3000/api/health")
print(f"Health: {health}")

if "ok" in health:
    # Login test
    login = run('''curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"username":"ceo","password":"123456"}' ''')
    try:
        token = json.loads(login).get("data", {}).get("token", "")
        if token:
            print(f"Login: OK (token received)")
            # Test audit logs
            audit = run(f'''curl -s "http://localhost:3000/api/audit-logs?limit=3" -H "Authorization: Bearer {token}"''')
            print(f"Audit logs: {audit[:200]}")
        else:
            print(f"Login response: {login[:200]}")
    except:
        print(f"Login response: {login[:200]}")
else:
    # Show log on failure
    log = run("tail -30 /tmp/backend.log")
    print(f"Backend log (last 30 lines):\n{log}")

ssh.close()
print("\nDONE")
