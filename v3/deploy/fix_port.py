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

# Kill everything on 8080 and 3000
run("fuser -k 8080/tcp 2>/dev/null")
run("fuser -k 3000/tcp 2>/dev/null")
run("pkill -9 -f 'tsx' 2>/dev/null")
time.sleep(2)

# Fix .env to use port 3000
run("sed -i 's/^PORT=.*/PORT=3000/' /home/ubuntu/acematic/backend-src/.env")
print("Set PORT=3000 in .env")

# Start backend on port 3000
run("cd /home/ubuntu/acematic/backend-src && nohup npx tsx src/index.ts > /tmp/backend.log 2>&1 &")
time.sleep(5)

# Check
ps = run("ps aux | grep 'tsx' | grep -v grep")
print(f"Process: {ps}")

h = run("curl -s --connect-timeout 3 http://localhost:3000/api/health")
print(f"Health 3000: {h}")

if "OK" not in h:
    log = run("tail -20 /tmp/backend.log")
    print(f"Log: {log}")

# Fix nginx to proxy to 3000
run("sudo sed -i 's/8080/3000/' /etc/nginx/sites-enabled/acematic")
run("sudo nginx -t 2>&1")
run("sudo systemctl reload nginx 2>&1")
print("Nginx reloaded -> proxy to 3000")

# Final test through nginx
h2 = run("curl -s --connect-timeout 3 http://localhost/api/health")
print(f"Health via nginx: {h2}")

ssh.close()
print("DONE")
