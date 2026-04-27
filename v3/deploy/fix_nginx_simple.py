import paramiko

key_path = r"C:\Users\Kenny\Desktop\workspace\OKR1.pem"
host = "43.138.204.20"
username = "ubuntu"

pkey = paramiko.RSAKey.from_private_key_file(key_path)
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(hostname=host, username=username, pkey=pkey)

nginx_config = '''server {
    listen 8080;
    server_name 43.138.204.20;

    root /home/ubuntu/acematic/frontend/dist;
    index index.html;

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
        try_files $uri $uri/ /index.html;
    }
}
'''

sftp = client.open_sftp()
with sftp.file('/tmp/nginx_simple.conf', 'w') as f:
    f.write(nginx_config)

stdin, stdout, stderr = client.exec_command('sudo cp /tmp/nginx_simple.conf /etc/nginx/sites-enabled/acematic && sudo nginx -t')
print("Test STDOUT:", stdout.read().decode())
print("Test STDERR:", stderr.read().decode())

stdin, stdout, stderr = client.exec_command('sudo nginx -s reload')
print("Reload STDOUT:", stdout.read().decode())
print("Reload STDERR:", stderr.read().decode())

# 测试
stdin, stdout, stderr = client.exec_command('curl -s -o /dev/null -w "%{http_code} %{content_type}" http://localhost:8080/assets/index-BPU-Ka4z.js')
print("JS Response:", stdout.read().decode())

stdin, stdout, stderr = client.exec_command('curl -s -o /dev/null -w "%{http_code} %{content_type}" http://localhost:8080/')
print("HTML Response:", stdout.read().decode())

client.close()
print("Done!")
