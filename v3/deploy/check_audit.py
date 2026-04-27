import paramiko

key_path = r"C:\Users\Kenny\Desktop\workspace\OKR1.pem"
host = "43.138.204.20"
username = "ubuntu"

pkey = paramiko.RSAKey.from_private_key_file(key_path)
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(hostname=host, username=username, pkey=pkey)

# 查找审计相关文件
stdin, stdout, stderr = client.exec_command('find /home/ubuntu/acematic/backend-src/src -name "audit*" -type f 2>/dev/null')
print("Audit files:", stdout.read().decode())

# 检查 utils 目录
stdin, stdout, stderr = client.exec_command('ls -la /home/ubuntu/acematic/backend-src/src/utils/ 2>/dev/null || echo "utils dir not found"')
print("Utils dir:", stdout.read().decode())

client.close()
