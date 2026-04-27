import paramiko, json

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

# Check backend logs for audit error
log = run("tail -30 /tmp/backend.log")
print("=== Backend Log (last 30 lines) ===")
print(log[-1000:])

# Check audit-logs.ts file exists and content
audit_file = run("cat /home/ubuntu/acematic/backend-src/src/modules/audit-logs.ts | head -50")
print("\n=== audit-logs.ts (first 50 lines) ===")
print(audit_file)

# Check if AuditLog model exists in schema
schema = run("grep -A10 'model AuditLog' /home/ubuntu/acematic/backend-src/prisma/schema.prisma")
print("\n=== AuditLog in schema ===")
print(schema)

# Check Prisma client generation
prisma_dir = run("ls -la /home/ubuntu/acematic/backend-src/node_modules/.prisma/client/ | grep -i audit")
print("\n=== Prisma client audit files ===")
print(prisma_dir)

ssh.close()
print("\nDONE")
