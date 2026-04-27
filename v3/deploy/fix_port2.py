import paramiko, time

KEY_PATH = r"C:\Users\Kenny\Desktop\workspace\OKR1.pem"
HOST = "43.138.204.20"
USER = "ubuntu"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
key = paramiko.RSAKey.from_private_key_file(KEY_PATH)
ssh.connect(HOST, username=USER, pkey=key, timeout=10)

def run(cmd, timeout=10):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    stdin.close()
    try:
        return stdout.read().decode().strip()
    except:
        return ""

# Kill everything
run("fuser -k 8080/tcp 2>/dev/null")
run("fuser -k 3000/tcp 2>/dev/null")
run("pkill -9 -f 'tsx' 2>/dev/null")
time.sleep(2)
print("Killed old processes")

# Fix .env PORT=3000
run("sed -i 's/^PORT=.*/PORT=3000/' /home/ubuntu/acematic/backend-src/.env")
print("Set PORT=3000")

# Start backend (don't read stdout of nohup)
transport = ssh.get_transport()
channel = transport.open_session()
channel.settimeout(5)
channel.exec_command("cd /home/ubuntu/acematic/backend-src && nohup npx tsx src/index.ts > /tmp/backend.log 2>&1 &")
time.sleep(6)
channel.close()

# Check process
ps = run("ps aux | grep 'tsx' | grep -v grep")
print(f"Process: {ps}")

# Health check
h = run("curl -s --connect-timeout 3 http://localhost:3000/api/health")
print(f"Health 3000: {h}")

if "OK" not in h:
    log = run("tail -20 /tmp/backend.log")
    print(f"Log: {log}")

# Fix nginx proxy to 3000
nginx_conf = """server {
    listen 80;
    server_name _;

    root /home/ubuntu/acematic/frontend/dist;
    index index.html;

    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}"""
# Write nginx config
sftp = ssh.open_sftp()
with sftp.open("/tmp/acematic_nginx.conf", "w") as f:
    f.write(nginx_conf)
sftp.close()

run("sudo cp /tmp/acematic_nginx.conf /etc/nginx/sites-enabled/acematic")
r = run("sudo nginx -t 2>&1")
print(f"Nginx test: {r}")
run("sudo systemctl reload nginx 2>&1")
print("Nginx reloaded")

# Final test
h2 = run("curl -s --connect-timeout 3 http://localhost/api/health")
print(f"Health via nginx: {h2}")

ssh.close()
print("DONE")
