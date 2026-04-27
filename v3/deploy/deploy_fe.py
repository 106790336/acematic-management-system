import paramiko
import zipfile
import os

key_path = r"C:\Users\Kenny\Desktop\workspace\OKR1.pem"
host = "43.138.204.20"
username = "ubuntu"
local_dist = r"C:\Users\Kenny\Desktop\workspace\frontend\dist"
remote_path = "/home/ubuntu/acematic/frontend/dist"
zip_path = r"C:\Users\Kenny\Desktop\workspace\dist.zip"

# 打包
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(local_dist):
        for file in files:
            local_file = os.path.join(root, file)
            arcname = os.path.relpath(local_file, local_dist)
            zf.write(local_file, arcname)

# 连接
pkey = paramiko.RSAKey.from_private_key_file(key_path)
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(hostname=host, username=username, pkey=pkey)

# 上传
sftp = client.open_sftp()
sftp.put(zip_path, "/tmp/dist.zip")

# 解压并设置权限
cmds = [
    f"rm -rf {remote_path}/*",
    f"cd {remote_path} && unzip -o /tmp/dist.zip",
    f"chmod -R 755 {remote_path}",
    f"ls -la {remote_path}/assets/"
]
for cmd in cmds:
    stdin, stdout, stderr = client.exec_command(cmd)
    print(f">>> {cmd}")
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out: print(out)
    if err: print("ERR:", err)

client.close()
print("Done!")
