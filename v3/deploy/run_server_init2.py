import paramiko

key_path = r"C:\Users\Kenny\Desktop\workspace\OKR1.pem"
host = "43.138.204.20"
username = "ubuntu"

pkey = paramiko.RSAKey.from_private_key_file(key_path)
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(hostname=host, username=username, pkey=pkey)

# 上传脚本
sftp = client.open_sftp()
sftp.put(r"C:\Users\Kenny\Desktop\workspace\server_init.sh", "/tmp/server_init.sh")
sftp.close()

# 执行脚本
print("Running database initialization...")
stdin, stdout, stderr = client.exec_command('chmod +x /tmp/server_init.sh && /tmp/server_init.sh 2>&1')

# 收集输出
out = stdout.read().decode('utf-8', errors='replace')
err = stderr.read().decode('utf-8', errors='replace')

print("\n=== OUTPUT ===")
print(out[-2000:])  # 最后2000字符

if err:
    print("\n=== ERRORS ===")
    print(err[-500:])

client.close()
print("\n=== Done ===")
