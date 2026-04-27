-- ============================================
-- 运营管理系统 数据库设计
-- 数据库类型：SQLite / PostgreSQL
-- 版本：v1.0
-- 日期：2026-04-04
-- ============================================

-- ============================================
-- 1. 基础数据表
-- ============================================

-- 部门表（组织架构）
CREATE TABLE departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(50) NOT NULL COMMENT '部门名称',
    code VARCHAR(20) COMMENT '部门编码',
    manager_id INTEGER COMMENT '部门负责人ID',
    description TEXT COMMENT '部门职责描述',
    parent_id INTEGER DEFAULT 0 COMMENT '上级部门ID',
    sort_order INTEGER DEFAULT 0 COMMENT '排序',
    status VARCHAR(20) DEFAULT 'active' COMMENT '状态：active/inactive',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 用户表
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
    password VARCHAR(255) NOT NULL COMMENT '密码（加密存储）',
    name VARCHAR(50) NOT NULL COMMENT '真实姓名',
    dept_id INTEGER COMMENT '所属部门ID',
    role VARCHAR(20) NOT NULL DEFAULT 'employee' COMMENT '角色：admin/director/manager/employee',
    phone VARCHAR(20) COMMENT '手机号',
    email VARCHAR(100) COMMENT '邮箱',
    avatar VARCHAR(255) COMMENT '头像URL',
    status VARCHAR(20) DEFAULT 'active' COMMENT '状态：active/inactive',
    last_login TIMESTAMP COMMENT '最后登录时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dept_id) REFERENCES departments(id)
);

-- 指标库表
CREATE TABLE indicators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL COMMENT '指标名称',
    code VARCHAR(50) COMMENT '指标编码',
    category VARCHAR(50) COMMENT '指标类型：财务类/客户类/流程类/学习成长类',
    unit VARCHAR(20) COMMENT '计量单位：万元/%/人/件',
    definition TEXT COMMENT '指标定义',
    formula TEXT COMMENT '计算公式',
    data_source TEXT COMMENT '数据来源',
    applicable_depts TEXT COMMENT '适用部门（JSON数组）',
    sort_order INTEGER DEFAULT 0 COMMENT '排序',
    status VARCHAR(20) DEFAULT 'active' COMMENT '状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. 战略管理表
-- ============================================

-- 年度目标表
CREATE TABLE annual_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER NOT NULL COMMENT '年度',
    dept_id INTEGER NOT NULL COMMENT '中心ID',
    indicator_id INTEGER COMMENT '指标ID（关联指标库）',
    indicator_name VARCHAR(100) NOT NULL COMMENT '指标名称',
    target_value DECIMAL(15,2) NOT NULL COMMENT '目标值',
    actual_value DECIMAL(15,2) COMMENT '实际完成值',
    weight DECIMAL(5,2) DEFAULT 0 COMMENT '权重（%）',
    q1_target DECIMAL(15,2) COMMENT '一季度目标',
    q2_target DECIMAL(15,2) COMMENT '二季度目标',
    q3_target DECIMAL(15,2) COMMENT '三季度目标',
    q4_target DECIMAL(15,2) COMMENT '四季度目标',
    q1_actual DECIMAL(15,2) COMMENT '一季度实际',
    q2_actual DECIMAL(15,2) COMMENT '二季度实际',
    q3_actual DECIMAL(15,2) COMMENT '三季度实际',
    q4_actual DECIMAL(15,2) COMMENT '四季度实际',
    achievement_rate DECIMAL(5,2) COMMENT '达成率（%）',
    performance_score DECIMAL(5,2) COMMENT '绩效得分',
    status VARCHAR(20) DEFAULT 'draft' COMMENT '状态：draft/signed/executing/completed',
    sign_file VARCHAR(255) COMMENT '签字版文件URL',
    remark TEXT COMMENT '备注',
    created_by INTEGER COMMENT '创建人ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dept_id) REFERENCES departments(id),
    FOREIGN KEY (indicator_id) REFERENCES indicators(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ============================================
-- 3. 计划管理表
-- ============================================

-- 月度经营计划表
CREATE TABLE monthly_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year_month VARCHAR(7) NOT NULL COMMENT '年月（格式：2026-04）',
    dept_id INTEGER NOT NULL COMMENT '中心ID',
    submitter_id INTEGER NOT NULL COMMENT '提交人ID',
    plan_item TEXT NOT NULL COMMENT '计划事项',
    target_value VARCHAR(200) COMMENT '目标值',
    responsible_id INTEGER COMMENT '责任人ID',
    budget DECIMAL(12,2) COMMENT '预算金额',
    deadline DATE COMMENT '完成时限',
    priority VARCHAR(10) DEFAULT 'medium' COMMENT '优先级：high/medium/low',
    approval_status VARCHAR(20) DEFAULT 'pending' COMMENT '审核状态：pending/submitted/approved/rejected',
    approval_comment TEXT COMMENT '审核意见',
    approver_id INTEGER COMMENT '审核人ID',
    approval_time TIMESTAMP COMMENT '审核时间',
    execution_status VARCHAR(20) DEFAULT 'not_started' COMMENT '执行状态：not_started/in_progress/completed/delayed',
    completion_rate DECIMAL(5,2) DEFAULT 0 COMMENT '完成进度（%）',
    actual_result TEXT COMMENT '实际完成情况',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dept_id) REFERENCES departments(id),
    FOREIGN KEY (submitter_id) REFERENCES users(id),
    FOREIGN KEY (responsible_id) REFERENCES users(id),
    FOREIGN KEY (approver_id) REFERENCES users(id)
);

-- 周计划表
CREATE TABLE weekly_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week_date DATE NOT NULL COMMENT '周起始日期（周一）',
    monthly_plan_id INTEGER COMMENT '关联月度计划ID',
    dept_id INTEGER NOT NULL COMMENT '中心ID',
    submitter_id INTEGER NOT NULL COMMENT '提交人ID',
    week_goal TEXT COMMENT '本周目标',
    key_actions TEXT COMMENT '关键动作',
    expected_output TEXT COMMENT '预期产出',
    completion TEXT COMMENT '完成情况',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (monthly_plan_id) REFERENCES monthly_plans(id),
    FOREIGN KEY (dept_id) REFERENCES departments(id),
    FOREIGN KEY (submitter_id) REFERENCES users(id)
);

-- ============================================
-- 4. 执行跟踪表
-- ============================================

-- 周报表
CREATE TABLE weekly_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week_date DATE NOT NULL COMMENT '周起始日期（周一）',
    dept_id INTEGER NOT NULL COMMENT '中心ID',
    submitter_id INTEGER NOT NULL COMMENT '提交人ID',
    completed_items TEXT COMMENT '本周完成事项',
    key_data TEXT COMMENT '关键数据（JSON格式）',
    next_week_plans TEXT COMMENT '下周重点事项',
    issues TEXT COMMENT '需要协调的问题',
    self_evaluation VARCHAR(20) COMMENT '自我评价：exceeded/met/unmet',
    ai_summary TEXT COMMENT 'AI生成的摘要',
    submitted_at TIMESTAMP COMMENT '提交时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dept_id) REFERENCES departments(id),
    FOREIGN KEY (submitter_id) REFERENCES users(id)
);

-- 问题清单表
CREATE TABLE issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    issue_no VARCHAR(20) NOT NULL UNIQUE COMMENT '问题编号',
    source VARCHAR(50) COMMENT '问题来源：weekly_report/meeting/other',
    discovered_at DATE NOT NULL COMMENT '发现时间',
    dept_id INTEGER NOT NULL COMMENT '所属中心ID',
    description TEXT NOT NULL COMMENT '问题描述',
    category VARCHAR(50) COMMENT '问题类型：quality/delivery/collaboration/other',
    severity VARCHAR(10) DEFAULT 'medium' COMMENT '严重程度：high/medium/low',
    responsible_id INTEGER COMMENT '责任人ID',
    planned_finish DATE COMMENT '计划完成时间',
    actual_finish DATE COMMENT '实际完成时间',
    status VARCHAR(20) DEFAULT 'pending' COMMENT '状态：pending/in_progress/resolved/suspended',
    solution TEXT COMMENT '解决措施',
    verification_result TEXT COMMENT '验证结果',
    escalation_level INTEGER DEFAULT 0 COMMENT '升级级别：0/1/2',
    created_by INTEGER COMMENT '创建人ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dept_id) REFERENCES departments(id),
    FOREIGN KEY (responsible_id) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 会议纪要表
CREATE TABLE meeting_minutes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(200) NOT NULL COMMENT '会议名称',
    meeting_type VARCHAR(50) COMMENT '会议类型：weekly/monthly/special',
    meeting_time TIMESTAMP NOT NULL COMMENT '会议时间',
    meeting_place VARCHAR(100) COMMENT '会议地点',
    host_id INTEGER COMMENT '主持人ID',
    recorder_id INTEGER COMMENT '记录人ID',
    attendees TEXT COMMENT '参会人员（JSON数组）',
    content TEXT COMMENT '会议内容',
    resolutions TEXT COMMENT '决议事项',
    next_meeting DATE COMMENT '下次会议时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (host_id) REFERENCES users(id),
    FOREIGN KEY (recorder_id) REFERENCES users(id)
);

-- 待办事项表（会议决议转化）
CREATE TABLE todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meeting_id INTEGER COMMENT '关联会议ID',
    issue_id INTEGER COMMENT '关联问题ID',
    content TEXT NOT NULL COMMENT '待办内容',
    responsible_id INTEGER COMMENT '责任人ID',
    deadline DATE COMMENT '完成时限',
    status VARCHAR(20) DEFAULT 'pending' COMMENT '状态：pending/in_progress/completed/cancelled',
    completion_note TEXT COMMENT '完成说明',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (meeting_id) REFERENCES meeting_minutes(id),
    FOREIGN KEY (issue_id) REFERENCES issues(id),
    FOREIGN KEY (responsible_id) REFERENCES users(id)
);

-- ============================================
-- 5. 分析复盘表
-- ============================================

-- 月度经营数据表
CREATE TABLE monthly_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year_month VARCHAR(7) NOT NULL COMMENT '年月',
    dept_id INTEGER NOT NULL COMMENT '中心ID',
    goal_id INTEGER COMMENT '关联年度目标ID',
    indicator_name VARCHAR(100) NOT NULL COMMENT '指标名称',
    monthly_target DECIMAL(15,2) COMMENT '本月目标',
    monthly_actual DECIMAL(15,2) COMMENT '本月实际',
    achievement_rate DECIMAL(5,2) COMMENT '达成率',
    last_year_actual DECIMAL(15,2) COMMENT '去年同期',
    yoy_growth DECIMAL(5,2) COMMENT '同比增长率',
    last_month_actual DECIMAL(15,2) COMMENT '上月实际',
    mom_growth DECIMAL(5,2) COMMENT '环比增长率',
    deviation_reason TEXT COMMENT '偏差原因',
    improvement_measure TEXT COMMENT '改进措施',
    created_by INTEGER COMMENT '录入人ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dept_id) REFERENCES departments(id),
    FOREIGN KEY (goal_id) REFERENCES annual_goals(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 改进措施跟踪表
CREATE TABLE improvements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    improvement_no VARCHAR(20) NOT NULL UNIQUE COMMENT '措施编号',
    issue_id INTEGER COMMENT '关联问题ID',
    description TEXT NOT NULL COMMENT '措施描述',
    responsible_id INTEGER COMMENT '责任人ID',
    planned_finish DATE COMMENT '计划完成时间',
    actual_finish DATE COMMENT '实际完成时间',
    progress DECIMAL(5,2) DEFAULT 0 COMMENT '执行进度（%）',
    execution_status VARCHAR(20) DEFAULT 'not_started' COMMENT '执行状态',
    effect_verification TEXT COMMENT '效果验证',
    effectiveness VARCHAR(20) COMMENT '是否有效：effective/partial/ineffective',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (issue_id) REFERENCES issues(id),
    FOREIGN KEY (responsible_id) REFERENCES users(id)
);

-- ============================================
-- 6. 系统配置表
-- ============================================

-- 系统参数表
CREATE TABLE system_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    config_key VARCHAR(100) NOT NULL UNIQUE COMMENT '配置键',
    config_value TEXT COMMENT '配置值',
    description TEXT COMMENT '配置说明',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 操作日志表
CREATE TABLE operation_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER COMMENT '操作用户ID',
    module VARCHAR(50) COMMENT '操作模块',
    action VARCHAR(50) COMMENT '操作动作',
    target_type VARCHAR(50) COMMENT '目标类型',
    target_id INTEGER COMMENT '目标ID',
    detail TEXT COMMENT '操作详情',
    ip_address VARCHAR(50) COMMENT 'IP地址',
    user_agent VARCHAR(255) COMMENT '用户代理',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 数据备份记录表
CREATE TABLE backup_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    backup_type VARCHAR(20) COMMENT '备份类型：full/incremental',
    backup_size INTEGER COMMENT '备份大小（字节）',
    backup_path VARCHAR(255) COMMENT '备份文件路径',
    status VARCHAR(20) COMMENT '状态：success/failed',
    error_message TEXT COMMENT '错误信息',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 7. AI分析记录表
-- ============================================

-- AI分析记录表
CREATE TABLE ai_analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    analysis_type VARCHAR(50) COMMENT '分析类型：weekly_summary/monthly_report/deviation_analysis',
    source_type VARCHAR(50) COMMENT '数据源类型',
    source_ids TEXT COMMENT '数据源ID列表（JSON数组）',
    prompt TEXT COMMENT '提示词',
    result TEXT COMMENT '分析结果',
    model VARCHAR(50) COMMENT '使用的模型',
    tokens_used INTEGER COMMENT '消耗的token数',
    created_by INTEGER COMMENT '请求人ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ============================================
-- 8. 索引创建
-- ============================================

-- 用户表索引
CREATE INDEX idx_users_dept ON users(dept_id);
CREATE INDEX idx_users_status ON users(status);

-- 年度目标表索引
CREATE INDEX idx_annual_goals_year ON annual_goals(year);
CREATE INDEX idx_annual_goals_dept ON annual_goals(dept_id);
CREATE INDEX idx_annual_goals_status ON annual_goals(status);

-- 月度计划表索引
CREATE INDEX idx_monthly_plans_month ON monthly_plans(year_month);
CREATE INDEX idx_monthly_plans_dept ON monthly_plans(dept_id);
CREATE INDEX idx_monthly_plans_status ON monthly_plans(approval_status);

-- 周报表索引
CREATE INDEX idx_weekly_reports_week ON weekly_reports(week_date);
CREATE INDEX idx_weekly_reports_dept ON weekly_reports(dept_id);

-- 问题清单表索引
CREATE INDEX idx_issues_status ON issues(status);
CREATE INDEX idx_issues_dept ON issues(dept_id);
CREATE INDEX idx_issues_severity ON issues(severity);

-- 月度数据表索引
CREATE INDEX idx_monthly_data_month ON monthly_data(year_month);
CREATE INDEX idx_monthly_data_dept ON monthly_data(dept_id);

-- ============================================
-- 9. 初始数据插入
-- ============================================

-- 插入部门数据
INSERT INTO departments (name, code, description, sort_order) VALUES 
('营销中心', 'MARKETING', '负责市场开拓、客户维护、销售达成', 1),
('产品中心', 'PRODUCT', '负责产品研发、生产制造、质量管控', 2),
('运营中心', 'OPERATION', '负责人力资源、财务管理、行政支持、质量监督', 3);

-- 插入管理员账号（密码：admin123，实际使用时需要加密）
INSERT INTO users (username, password, name, dept_id, role, status) VALUES 
('admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIBXmIkUuK', '系统管理员', NULL, 'admin', 'active');

-- 插入系统配置
INSERT INTO system_configs (config_key, config_value, description) VALUES 
('monthly_plan_submit_day', '25', '月度计划提交日期（每月几号）'),
('weekly_report_submit_day', '5', '周报提交日期（周几，1-7）'),
('warning_threshold_yellow', '85', '黄色预警阈值（达成率%）'),
('warning_threshold_red', '70', '红色预警阈值（达成率%）'),
('data_retention_years', '3', '数据保留年限'),
('ai_model', 'doubao', 'AI模型选择：doubao/zhipu/ollama'),
('ai_enabled', 'true', '是否启用AI功能');

-- 插入指标库数据
INSERT INTO indicators (name, code, category, unit, definition, applicable_depts) VALUES 
('年度营收', 'REVENUE', '财务类', '万元', '全年销售收入总额', '[1]'),
('回款达成率', 'PAYMENT_RATE', '财务类', '%', '实际回款金额÷应收账款×100%', '[1]'),
('客户满意度', 'CUSTOMER_SAT', '客户类', '分', '客户满意度调查平均得分', '[1]'),
('订单交付率', 'DELIVERY_RATE', '流程类', '%', '按时交付订单数÷总订单数×100%', '[2]'),
('出厂合格率', 'QUALITY_RATE', '流程类', '%', '检验合格产品数÷总产品数×100%', '[2]'),
('成本控制率', 'COST_CONTROL', '财务类', '%', '预算成本÷实际成本×100%', '[2]'),
('人才到岗率', 'STAFFING_RATE', '学习成长类', '%', '实际到岗人数÷计划招聘人数×100%', '[3]'),
('费用执行率', 'BUDGET_RATE', '财务类', '%', '实际费用÷预算费用×100%', '[3]');

-- ============================================
-- 10. 视图创建
-- ============================================

-- 年度目标进度视图
CREATE VIEW v_annual_goal_progress AS
SELECT 
    ag.id,
    ag.year,
    d.name as dept_name,
    ag.indicator_name,
    ag.target_value,
    ag.actual_value,
    ag.weight,
    ag.achievement_rate,
    ag.status,
    CASE 
        WHEN ag.achievement_rate >= 95 THEN 'green'
        WHEN ag.achievement_rate >= 85 THEN 'yellow'
        ELSE 'red'
    END as health_status
FROM annual_goals ag
LEFT JOIN departments d ON ag.dept_id = d.id
WHERE ag.status = 'executing';

-- 月度计划执行视图
CREATE VIEW v_monthly_plan_execution AS
SELECT 
    mp.id,
    mp.year_month,
    d.name as dept_name,
    u.name as submitter_name,
    mp.plan_item,
    mp.target_value,
    mp.execution_status,
    mp.completion_rate,
    mp.deadline,
    CASE 
        WHEN mp.execution_status = 'completed' THEN 'completed'
        WHEN mp.deadline < date('now') AND mp.execution_status != 'completed' THEN 'overdue'
        WHEN mp.completion_rate >= 80 THEN 'on_track'
        ELSE 'at_risk'
    END as execution_health
FROM monthly_plans mp
LEFT JOIN departments d ON mp.dept_id = d.id
LEFT JOIN users u ON mp.submitter_id = u.id
WHERE mp.approval_status = 'approved';

-- 问题预警视图
CREATE VIEW v_issue_alerts AS
SELECT 
    i.id,
    i.issue_no,
    d.name as dept_name,
    i.description,
    i.severity,
    i.status,
    i.planned_finish,
    julianday('now') - julianday(i.discovered_at) as days_open,
    CASE 
        WHEN i.status = 'pending' AND i.severity = 'high' THEN 'urgent'
        WHEN i.status = 'pending' AND julianday('now') - julianday(i.discovered_at) > 7 THEN 'warning'
        WHEN i.status = 'in_progress' AND julianday('now') > julianday(i.planned_finish) THEN 'overdue'
        ELSE 'normal'
    END as alert_level
FROM issues i
LEFT JOIN departments d ON i.dept_id = d.id
WHERE i.status IN ('pending', 'in_progress');

-- 运营驾驶舱视图
CREATE VIEW v_dashboard AS
SELECT 
    d.id as dept_id,
    d.name as dept_name,
    COUNT(DISTINCT ag.id) as total_goals,
    AVG(ag.achievement_rate) as avg_achievement,
    COUNT(DISTINCT CASE WHEN mp.execution_status = 'completed' THEN mp.id END) as completed_plans,
    COUNT(DISTINCT mp.id) as total_plans,
    COUNT(DISTINCT CASE WHEN i.status IN ('pending', 'in_progress') THEN i.id END) as open_issues,
    COUNT(DISTINCT CASE WHEN i.severity = 'high' THEN i.id END) as high_severity_issues
FROM departments d
LEFT JOIN annual_goals ag ON d.id = ag.dept_id AND ag.year = strftime('%Y', 'now')
LEFT JOIN monthly_plans mp ON d.id = mp.dept_id AND mp.year_month = strftime('%Y-%m', 'now')
LEFT JOIN issues i ON d.id = i.dept_id
GROUP BY d.id, d.name;

-- ============================================
-- 数据库设计完成
-- ============================================
