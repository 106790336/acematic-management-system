import subprocess

key = r"C:\Users\Kenny\Desktop\workspace\OKR1.pem"
host = "ubuntu@43.138.204.20"

# 1. Kill backend on 8080
cmd1 = ["ssh", "-i", key, "-o", "StrictHostKeyChecking=no", host, "sudo kill 302344 || true"]
result1 = subprocess.run(cmd1, capture_output=True)
print("Kill backend:", result1.returncode)

# 2. Update .env to port 3000
cmd2 = ["ssh", "-i", key, "-o", "StrictHostKeyChecking=no", host, "sed -i 's/PORT=8080/PORT=3000/' /home/ubuntu/acematic/backend-src/.env"]
result2 = subprocess.run(cmd2, capture_output=True)
print("Update .env:", result2.returncode)

# 3. Update nginx to proxy to 3000
nginx_conf = r'''server {
    listen 8080;
    server_name 43.138.204.20;

    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";

    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_buffering off;
        proxy_request_buffering off;
    }

    location / {
        root /home/ubuntu/acematic/frontend/dist;
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
}
'''

cmd3 = ["ssh", "-i", key, "-o", "StrictHostKeyChecking=no", host, "sudo bash -c 'cat > /etc/nginx/sites-enabled/acematic'"]
result3 = subprocess.run(cmd3, input=nginx_conf.encode('utf-8'), capture_output=True)
print("Update nginx:", result3.returncode)

# 4. Test and reload nginx
cmd4 = ["ssh", "-i", key, "-o", "StrictHostKeyChecking=no", host, "sudo nginx -t && sudo systemctl reload nginx"]
result4 = subprocess.run(cmd4, capture_output=True)
print("Nginx reload:", result4.stderr.decode('utf-8', errors='ignore')[:200])

# 5. Start backend on port 3000
cmd5 = ["ssh", "-i", key, "-o", "StrictHostKeyChecking=no", host, "cd /home/ubuntu/acematic/backend-src && nohup npx tsx watch src/index.ts > backend.log 2>&1 &"]
result5 = subprocess.run(cmd5, capture_output=True)
print("Start backend:", result5.returncode)

print("\nDone! Access http://43.138.204.20:8080")
