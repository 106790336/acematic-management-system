import paramiko
import os

# 连接服务器
key_path = r"C:\Users\Kenny\Desktop\workspace\OKR1.pem"
host = "43.138.204.20"
username = "ubuntu"

pkey = paramiko.RSAKey.from_private_key_file(key_path)
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(hostname=host, username=username, pkey=pkey)

# 新的 nginx 配置
nginx_config = '''server {
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

    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root /home/ubuntu/acematic/frontend/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    location / {
        root /home/ubuntu/acematic/frontend/dist;
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
}
'''

# 写入临时文件
sftp = client.open_sftp()
with sftp.file('/tmp/nginx_fix.conf', 'w') as f:
    f.write(nginx_config)

# 复制并测试
stdin, stdout, stderr = client.exec_command('sudo cp /tmp/nginx_fix.conf /etc/nginx/sites-enabled/acematic && sudo nginx -t')
print("STDOUT:", stdout.read().decode())
print("STDERR:", stderr.read().decode())

# 如果测试通过，重载
stdin, stdout, stderr = client.exec_command('sudo nginx -s reload')
print("Reload STDOUT:", stdout.read().decode())
print("Reload STDERR:", stderr.read().decode())

# 测试 JS 文件
stdin, stdout, stderr = client.exec_command('curl -s -o /dev/null -w "%{content_type}" http://localhost:8080/assets/index-BPU-Ka4z.js')
print("JS Content-Type:", stdout.read().decode())

client.close()
print("Done!")
