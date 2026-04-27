import sqlite3

# 连接到数据库
db_path = '/home/ubuntu/acematic/backend-src/prisma/dev.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 将 Plan 表中的 in_progress 更新为 active
print("迁移 Plan 表...")
cursor.execute("UPDATE Plan SET status = 'active' WHERE status = 'in_progress'")
plan_updated = cursor.rowcount

# 检查是否还有其他表有 in_progress
print("\n检查其他表...")

# 检查 Task 表
cursor.execute("SELECT COUNT(*) FROM Task WHERE status = 'in_progress'")
task_count = cursor.fetchone()[0]
if task_count > 0:
    cursor.execute("UPDATE Task SET status = 'active' WHERE status = 'in_progress'")
    print(f"  Task 表: 更新了 {cursor.rowcount} 条")

# 检查 Strategy 表
cursor.execute("SELECT COUNT(*) FROM Strategy WHERE status = 'in_progress'")
strategy_count = cursor.fetchone()[0]
if strategy_count > 0:
    cursor.execute("UPDATE Strategy SET status = 'active' WHERE status = 'in_progress'")
    print(f"  Strategy 表: 更新了 {cursor.rowcount} 条")

conn.commit()
conn.close()

print(f"\n✓ Plan 表: 更新了 {plan_updated} 条 in_progress → active")
print("✓ 数据迁移完成")
