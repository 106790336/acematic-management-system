import paramiko, json

KEY_PATH = r"C:\Users\Kenny\Desktop\workspace\OKR1.pem"
HOST = "43.138.204.20"
USER = "ubuntu"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
key = paramiko.RSAKey.from_private_key_file(KEY_PATH)
ssh.connect(HOST, username=USER, pkey=key, timeout=10)

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=10)
    return stdout.read().decode().strip()

# Login first
login = run('''curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"username":"ceo","password":"123456"}' ''')
print(f"Login: {login[:200]}")

token = json.loads(login).get("data", {}).get("token", "")
if not token:
    print("Login failed!")
    ssh.close()
    exit(1)

# Get current user
user_info = run(f'''curl -s http://localhost:3000/api/users/me -H "Authorization: Bearer {token}"''')
print(f"User: {user_info[:200]}")

# Test: Create a department (should trigger audit)
create_dept = run(f'''curl -s -X POST http://localhost:3000/api/departments -H "Content-Type: application/json" -H "Authorization: Bearer {token}" -d '{{"name":"AuditTestDept"}}' ''')
print(f"Create dept: {create_dept[:200]}")

# Test: Update department
if '"id"' in create_dept:
    dept_id = json.loads(create_dept).get("data", {}).get("id", "")
    if dept_id:
        update_dept = run(f'''curl -s -X PUT http://localhost:3000/api/departments/{dept_id} -H "Content-Type: application/json" -H "Authorization: Bearer {token}" -d '{{"name":"AuditTestDeptUpdated","description":"test"}}' ''')
        print(f"Update dept: {update_dept[:200]}")
        
        # Delete it
        del_dept = run(f'''curl -s -X DELETE http://localhost:3000/api/departments/{dept_id} -H "Authorization: Bearer {token}"''')
        print(f"Delete dept: {del_dept[:200]}")

# Check audit logs
audit = run(f'''curl -s "http://localhost:3000/api/audit-logs?limit=5" -H "Authorization: Bearer {token}"''')
print(f"\nAudit logs: {audit[:500]}")

ssh.close()
print("\nDONE")
