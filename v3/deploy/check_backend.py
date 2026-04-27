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

# Check if backend is running
ps = run("ps aux | grep tsx | grep -v grep")
print(f"Backend process: {ps}")

# Check port
port = run("netstat -tlnp 2>/dev/null | grep 3000 || ss -tlnp | grep 3000")
print(f"Port 3000: {port}")

# Check backend log
log = run("tail -20 /tmp/backend.log")
print(f"Log: {log[-500:]}")

# Try health check
health = run("curl -s --connect-timeout 3 http://localhost:3000/api/health")
print(f"Health: {health}")

if "ok" not in health:
    # Restart backend
    print("Backend not healthy, restarting...")
    run("fuser -k 3000/tcp 2>/dev/null")
    run("pkill -9 -f 'tsx' 2>/dev/null")
    time.sleep(2)
    
    transport = ssh.get_transport()
    channel = transport.open_session()
    channel.settimeout(5)
    channel.exec_command("cd /home/ubuntu/acematic/backend-src && nohup npx tsx src/index.ts > /tmp/backend.log 2>&1 &")
    time.sleep(6)
    channel.close()
    
    health2 = run("curl -s --connect-timeout 3 http://localhost:3000/api/health")
    print(f"Health after restart: {health2}")

ssh.close()
print("DONE")
