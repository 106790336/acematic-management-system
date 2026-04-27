-- ============================================
-- ACEMATIC运营管理系统 - Phase 1 子任务功能
-- 数据库迁移脚本 v2.1
-- 执行方式：SQLite3 
-- sqlite3 management.db < migration_v2.1_subtask.sql
-- ============================================

-- 1. 任务表
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- 基础信息
    title VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- 来源追溯
    source_type VARCHAR(30) NOT NULL DEFAULT 'assigned',
    source_id INTEGER,
    source_description TEXT,
    
    -- 权限信息
    creator_id INTEGER NOT NULL,
    assignee_id INTEGER NOT NULL,
    
    -- 子任务关联 (PRD v2.1核心)
    parent_task_id INTEGER,
    is_parent_task INTEGER DEFAULT 0,
    subtask_count INTEGER DEFAULT 0,
    completed_subtask_count INTEGER DEFAULT 0,
    subtask_weight_mode VARCHAR(10) DEFAULT 'equal',
    current_level INTEGER DEFAULT 1,
    subtask_weight FLOAT DEFAULT 0,
    max_subtask_level INTEGER DEFAULT 3,
    
    -- 关联目标
    strategy_id INTEGER,
    plan_id INTEGER,
    alignment_score FLOAT DEFAULT 0,
    
    -- 进度
    progress INTEGER DEFAULT 0,
    progress_calculation VARCHAR(10) DEFAULT 'manual',
    
    -- 状态
    status VARCHAR(20) DEFAULT 'pending',
    priority VARCHAR(10) DEFAULT 'medium',
    
    -- 时间
    start_date DATE,
    due_date DATE,
    estimated_hours FLOAT,
    actual_hours FLOAT,
    
    -- 审批
    approval_status VARCHAR(20) DEFAULT 'none',
    rejection_reason TEXT,
    
    -- 验收
    submit_complete_at DATETIME,
    verified_by INTEGER,
    verified_at DATETIME,
    verification_comment TEXT,
    
    -- 标记
    can_complete INTEGER DEFAULT 0,
    
    -- 元数据
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (creator_id) REFERENCES users(id),
    FOREIGN KEY (assignee_id) REFERENCES users(id),
    FOREIGN KEY (parent_task_id) REFERENCES tasks(id),
    FOREIGN KEY (verified_by) REFERENCES users(id)
);

-- 2. 任务进度日志表
CREATE TABLE IF NOT EXISTS task_progress_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    old_progress INTEGER DEFAULT 0,
    new_progress INTEGER DEFAULT 0,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (task_id) REFERENCES tasks(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 3. 任务评论表
CREATE TABLE IF NOT EXISTS task_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (task_id) REFERENCES tasks(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 4. 索引（性能优化）
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_creator ON tasks(creator_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_source ON tasks(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_tasks_progress_logs_task ON task_progress_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id);

-- 5. 初始数据（可选）- 创建任务来源类型参考
-- 来源类型说明：
-- assigned: 上级分配
-- self_initiated: 主动申请
-- plan_decomposition: 从月度计划分解
-- task_decomposition: 从父任务分解