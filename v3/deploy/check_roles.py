import sqlite3

# 连接到数据库
db_path = '/home/ubuntu/acematic/backend-src/prisma/dev.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 检查 Role 表结构
print("=== Role 表结构 ===")
cursor.execute("PRAGMA table_info(Role)")
for col in cursor.fetchall():
    print(f"  {col[1]} ({col[2]})")

# 检查角色数据
print("\n=== Role 表数据 ===")
cursor.execute("SELECT * FROM Role")
columns = [desc[0] for desc in cursor.description]
print(f"列: {columns}")
for row in cursor.fetchall():
    print(f"  {row}")

# 检查 User 表结构
print("\n=== User 表结构 ===")
cursor.execute("PRAGMA table_info(User)")
for col in cursor.fetchall():
    print(f"  {col[1]} ({col[2]})")

# 检查用户数据（带 isActive）
print("\n=== User 表数据（前5条） ===")
cursor.execute("SELECT id, name, role, isActive, departmentId FROM User LIMIT 5")
for row in cursor.fetchall():
    print(f"  {row}")

conn.close()
