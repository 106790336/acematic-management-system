import paramiko, json, time

KEY_PATH = r"C:\Users\Kenny\Desktop\workspace\OKR1.pem"
HOST = "43.138.204.20"
USER = "ubuntu"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
key = paramiko.RSAKey.from_private_key_file(KEY_PATH)
ssh.connect(HOST, username=USER, pkey=key, timeout=10)

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=15)
    stdin.close()
    try:
        out = stdout.read().decode().strip()
        err = stderr.read().decode().strip()
        return out + (f"\n{err}" if err else "")
    except Exception as e:
        return str(e)

# Get FULL backend log
log = run("cat /tmp/backend.log 2>/dev/null || echo 'NO LOG FILE'")
print(f"=== BACKEND LOG (full) ===\n{log}")

# Also check if any tsx process exists
ps = run("ps aux | grep -E 'tsx|node' | grep -v grep")
print(f"\n=== PROCESSES ===\n{ps}")

# Check port
port = run("ss -tlnp | grep -E '3000|8080'")
print(f"\n=== PORTS ===\n{port}")

ssh.close()
