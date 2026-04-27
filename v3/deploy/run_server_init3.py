import paramiko
import codecs

# 设置 stdout 编码
import sys
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

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

# 过滤掉特殊字符
out_clean = ''.join(c if ord(c) < 128 else '?' for c in out)
err_clean = ''.join(c if ord(c) < 128 else '?' for c in err)

print("\n=== OUTPUT (last 1500 chars) ===")
print(out_clean[-1500:])

if err_clean.strip():
    print("\n=== ERRORS ===")
    print(err_clean[-500:])

client.close()
print("\n=== Done ===")
