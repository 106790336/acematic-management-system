import subprocess

nginx_conf = r'''server {
    listen 8080;
    server_name 43.138.204.20;

    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";

    location /api {
        proxy_pass http://127.0.0.1:8080;
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

# Write config to server via SSH
key = r"C:\Users\Kenny\Desktop\workspace\OKR1.pem"
host = "ubuntu@43.138.204.20"

cmd = [
    "ssh", "-i", key, "-o", "StrictHostKeyChecking=no",
    host, "sudo bash -c 'cat > /etc/nginx/sites-enabled/acematic'"
]

result = subprocess.run(cmd, input=nginx_conf.encode('utf-8'), capture_output=True)
print("STDOUT:", result.stdout.decode('utf-8', errors='ignore')[:200])
print("STDERR:", result.stderr.decode('utf-8', errors='ignore')[:200])
print("Return code:", result.returncode)

# Test and reload nginx
cmd2 = [
    "ssh", "-i", key, "-o", "StrictHostKeyChecking=no",
    host, "sudo nginx -t && sudo systemctl reload nginx"
]
result2 = subprocess.run(cmd2, capture_output=True)
print("\nNginx test:", result2.stdout.decode('utf-8', errors='ignore')[:200])
print("Nginx stderr:", result2.stderr.decode('utf-8', errors='ignore')[:200])
