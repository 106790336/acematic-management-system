import paramiko, time

KEY_PATH = r"C:\Users\Kenny\Desktop\workspace\OKR1.pem"
HOST = "43.138.204.20"
USER = "ubuntu"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
key = paramiko.RSAKey.from_private_key_file(KEY_PATH)
ssh.connect(HOST, username=USER, pkey=key, timeout=10)

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=10)
    return stdout.read().decode().strip()

# Kill old
run("pkill -9 -f 'tsx' 2>/dev/null")
time.sleep(1)

# Check .env PORT
port = run("grep '^PORT=' /home/ubuntu/acematic/backend-src/.env")
print(f"ENV PORT: {port}")

# Start with explicit PORT override using 8080
run("cd /home/ubuntu/acematic/backend-src && PORT=8080 nohup npx tsx src/index.ts > /tmp/backend.log 2>&1 &")
time.sleep(5)

# Check process
ps = run("ps aux | grep 'tsx' | grep -v grep")
print(f"Process: {ps}")

# Health check
h1 = run("curl -s --connect-timeout 3 http://localhost:8080/api/health")
print(f"Health 8080: {h1}")

h2 = run("curl -s --connect-timeout 3 http://localhost:3000/api/health")
print(f"Health 3000: {h2}")

# Check log if no health
if "OK" not in (h1 + h2):
    log = run("tail -20 /tmp/backend.log")
    print(f"Log: {log}")

ssh.close()
print("DONE")
