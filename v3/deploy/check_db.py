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
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out + (f"\n{err}" if err else "")

# Check Prisma schema has AuditLog
schema = run("grep -A 20 'model AuditLog' /home/ubuntu/acematic/backend-src/prisma/schema.prisma")
print(f"=== AuditLog in schema ===\n{schema or 'NOT FOUND'}")

# Check database tables
tables = run("sqlite3 /home/ubuntu/acematic/backend-src/prisma/dev.db '.tables'")
print(f"\n=== Database tables ===\n{tables}")

# Check if AuditLog table exists
audit_table = run("sqlite3 /home/ubuntu/acematic/backend-src/prisma/dev.db 'SELECT name FROM sqlite_master WHERE type=\"table\" AND name=\"AuditLog\"'")
print(f"\n=== AuditLog table exists? ===\n{audit_table or 'NO'}")

# If no AuditLog table, sync schema
if not audit_table:
    print("\nAuditLog table missing! Running prisma db push...")
    push = run("cd /home/ubuntu/acematic/backend-src && npx prisma db push --skip-generate 2>&1")
    print(f"Prisma push result: {push[:500]}")
    
    # Verify again
    audit_table2 = run("sqlite3 /home/ubuntu/acematic/backend-src/prisma/dev.db 'SELECT name FROM sqlite_master WHERE type=\"table\" AND name=\"AuditLog\"'")
    print(f"\n=== AuditLog table after push ===\n{audit_table2 or 'STILL NO'}")

ssh.close()
print("\nDONE")