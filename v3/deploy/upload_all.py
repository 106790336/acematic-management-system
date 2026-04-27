import paramiko, json, time, os

KEY_PATH = r"C:\Users\Kenny\Desktop\workspace\OKR1.pem"
HOST = "43.138.204.20"
USER = "ubuntu"
LOCAL_BACKEND = r"C:\Users\Kenny\Desktop\workspace\backend\src"
REMOTE_BACKEND = "/home/ubuntu/acematic/backend-src/src"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
key = paramiko.RSAKey.from_private_key_file(KEY_PATH)
ssh.connect(HOST, username=USER, pkey=key, timeout=10)

sftp = ssh.open_sftp()

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=15)
    stdin.close()
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out + (f"\n{err}" if err else "")

# Files to upload (modules that were recently modified)
files_to_upload = [
    "modules/audit-logs.ts",
    "modules/plans.ts",
    "modules/tasks.ts",
    "modules/users.ts",
    "modules/departments.ts",
    "modules/change-requests.ts",
    "modules/workflows.ts",
    "modules/system-version.ts",
    "modules/settings.ts",
    "modules/strategies.ts",
    "utils/audit.ts",
]

uploaded = 0
for rel in files_to_upload:
    local_path = os.path.join(LOCAL_BACKEND, rel.replace("/", os.sep))
    remote_path = f"{REMOTE_BACKEND}/{rel}"
    if os.path.exists(local_path):
        # Ensure remote directory exists
        remote_dir = os.path.dirname(remote_path)
        try:
            sftp.stat(remote_dir)
        except FileNotFoundError:
            run(f"mkdir -p {remote_dir}")
        sftp.put(local_path, remote_path)
        # Verify
        remote_first_line = run(f"head -1 {remote_path}").strip()
        local_first_line = ""
        with open(local_path, "r", encoding="utf-8") as f:
            local_first_line = f.readline().strip()
        match = "OK" if remote_first_line == local_first_line else f"MISMATCH local={local_first_line[:50]} remote={remote_first_line[:50]}"
        print(f"{match} {rel}")
        uploaded += 1
    else:
        print(f"SKIP {rel} (not found locally)")

print(f"\nUploaded {uploaded}/{len(files_to_upload)} files via SFTP")

# Also verify audit-logs.ts is not corrupted
print(f"\n=== audit-logs.ts first 5 lines ===")
print(run("head -5 /home/ubuntu/acematic/backend-src/src/modules/audit-logs.ts"))

sftp.close()
ssh.close()
print("\nDONE")
