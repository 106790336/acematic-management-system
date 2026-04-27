"""
运营管理系统 - 后端API服务
技术栈：Python Flask + SQLAlchemy + JWT
版本：v1.0
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from sqlalchemy import create_engine, Column, Integer, String, Float, Text, DateTime, ForeignKey, Date
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime, timedelta
import bcrypt
import json
import os

# ============================================
# 应用初始化
# ============================================

app = Flask(__name__)
CORS(app)

# 配置
app.config['JWT_SECRET_KEY'] = 'your-secret-key-change-in-production'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
jwt = JWTManager(app)

# 数据库连接
DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///operations_management.db')
engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ============================================
# 数据库模型
# ============================================

class Department(Base):
    """部门表"""
    __tablename__ = 'departments'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), nullable=False)
    code = Column(String(20))
    manager_id = Column(Integer)
    description = Column(Text)
    parent_id = Column(Integer, default=0)
    sort_order = Column(Integer, default=0)
    status = Column(String(20), default='active')
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class User(Base):
    """用户表"""
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    name = Column(String(50), nullable=False)
    dept_id = Column(Integer, ForeignKey('departments.id'))
    role = Column(String(20), default='employee')
    phone = Column(String(20))
    email = Column(String(100))
    avatar = Column(String(255))
    status = Column(String(20), default='active')
    last_login = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class AnnualGoal(Base):
    """年度目标表"""
    __tablename__ = 'annual_goals'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    year = Column(Integer, nullable=False)
    dept_id = Column(Integer, ForeignKey('departments.id'), nullable=False)
    indicator_name = Column(String(100), nullable=False)
    target_value = Column(Float, nullable=False)
    actual_value = Column(Float)
    weight = Column(Float, default=0)
    q1_target = Column(Float)
    q2_target = Column(Float)
    q3_target = Column(Float)
    q4_target = Column(Float)
    achievement_rate = Column(Float)
    status = Column(String(20), default='draft')
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class MonthlyPlan(Base):
    """月度计划表"""
    __tablename__ = 'monthly_plans'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    year_month = Column(String(7), nullable=False)
    dept_id = Column(Integer, ForeignKey('departments.id'), nullable=False)
    submitter_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    plan_item = Column(Text, nullable=False)
    target_value = Column(String(200))
    responsible_id = Column(Integer, ForeignKey('users.id'))
    budget = Column(Float)
    deadline = Column(Date)
    priority = Column(String(10), default='medium')
    approval_status = Column(String(20), default='pending')
    approval_comment = Column(Text)
    execution_status = Column(String(20), default='not_started')
    completion_rate = Column(Float, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class WeeklyReport(Base):
    """周报表"""
    __tablename__ = 'weekly_reports'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    week_date = Column(Date, nullable=False)
    dept_id = Column(Integer, ForeignKey('departments.id'), nullable=False)
    submitter_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    completed_items = Column(Text)
    key_data = Column(Text)
    next_week_plans = Column(Text)
    issues = Column(Text)
    self_evaluation = Column(String(20))
    ai_summary = Column(Text)
    submitted_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Issue(Base):
    """问题清单表"""
    __tablename__ = 'issues'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    issue_no = Column(String(20), unique=True, nullable=False)
    source = Column(String(50))
    discovered_at = Column(Date, nullable=False)
    dept_id = Column(Integer, ForeignKey('departments.id'), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(50))
    severity = Column(String(10), default='medium')
    responsible_id = Column(Integer, ForeignKey('users.id'))
    planned_finish = Column(Date)
    actual_finish = Column(Date)
    status = Column(String(20), default='pending')
    solution = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class MonthlyData(Base):
    """月度经营数据表"""
    __tablename__ = 'monthly_data'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    year_month = Column(String(7), nullable=False)
    dept_id = Column(Integer, ForeignKey('departments.id'), nullable=False)
    indicator_name = Column(String(100), nullable=False)
    monthly_target = Column(Float)
    monthly_actual = Column(Float)
    achievement_rate = Column(Float)
    last_year_actual = Column(Float)
    yoy_growth = Column(Float)
    last_month_actual = Column(Float)
    mom_growth = Column(Float)
    deviation_reason = Column(Text)
    improvement_measure = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# 创建表
Base.metadata.create_all(bind=engine)

# ============================================
# 工具函数
# ============================================

def get_db():
    """获取数据库会话"""
    db = SessionLocal()
    try:
        return db
    except:
        db.close()
        raise

def hash_password(password):
    """密码加密"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password, hashed):
    """密码验证"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def generate_issue_no():
    """生成问题编号"""
    db = get_db()
    count = db.query(Issue).count() + 1
    db.close()
    return f"P{datetime.now().strftime('%Y%m')}{str(count).zfill(4)}"

def check_permission(user_role, required_roles):
    """检查权限"""
    return user_role in required_roles

# ============================================
# 认证接口
# ============================================

@app.route('/api/auth/login', methods=['POST'])
def login():
    """用户登录"""
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'error': '用户名和密码不能为空'}), 400
    
    db = get_db()
    user = db.query(User).filter(User.username == username).first()
    
    if not user or not verify_password(password, user.password):
        db.close()
        return jsonify({'error': '用户名或密码错误'}), 401
    
    if user.status != 'active':
        db.close()
        return jsonify({'error': '账号已被禁用'}), 403
    
    # 更新最后登录时间
    user.last_login = datetime.utcnow()
    db.commit()
    
    # 生成token
    access_token = create_access_token(identity={
        'id': user.id,
        'username': user.username,
        'name': user.name,
        'role': user.role,
        'dept_id': user.dept_id
    })
    
    # 获取部门信息
    dept = db.query(Department).filter(Department.id == user.dept_id).first()
    
    db.close()
    
    return jsonify({
        'token': access_token,
        'user': {
            'id': user.id,
            'username': user.username,
            'name': user.name,
            'role': user.role,
            'dept_id': user.dept_id,
            'dept_name': dept.name if dept else None,
            'avatar': user.avatar
        }
    })

@app.route('/api/auth/profile', methods=['GET'])
@jwt_required()
def get_profile():
    """获取当前用户信息"""
    current_user = get_jwt_identity()
    db = get_db()
    
    user = db.query(User).filter(User.id == current_user['id']).first()
    dept = db.query(Department).filter(Department.id == user.dept_id).first()
    
    result = {
        'id': user.id,
        'username': user.username,
        'name': user.name,
        'role': user.role,
        'dept_id': user.dept_id,
        'dept_name': dept.name if dept else None,
        'phone': user.phone,
        'email': user.email,
        'avatar': user.avatar
    }
    
    db.close()
    return jsonify(result)

# ============================================
# 部门接口
# ============================================

@app.route('/api/departments', methods=['GET'])
@jwt_required()
def get_departments():
    """获取部门列表"""
    db = get_db()
    departments = db.query(Department).filter(Department.status == 'active').order_by(Department.sort_order).all()
    
    result = [{
        'id': dept.id,
        'name': dept.name,
        'code': dept.code,
        'manager_id': dept.manager_id,
        'description': dept.description
    } for dept in departments]
    
    db.close()
    return jsonify(result)

# ============================================
# 用户接口
# ============================================

@app.route('/api/users', methods=['GET'])
@jwt_required()
def get_users():
    """获取用户列表"""
    current_user = get_jwt_identity()
    if not check_permission(current_user['role'], ['admin', 'director']):
        return jsonify({'error': '权限不足'}), 403
    
    db = get_db()
    users = db.query(User).filter(User.status == 'active').all()
    
    result = []
    for user in users:
        dept = db.query(Department).filter(Department.id == user.dept_id).first()
        result.append({
            'id': user.id,
            'username': user.username,
            'name': user.name,
            'role': user.role,
            'dept_id': user.dept_id,
            'dept_name': dept.name if dept else None,
            'phone': user.phone,
            'email': user.email
        })
    
    db.close()
    return jsonify(result)

@app.route('/api/users', methods=['POST'])
@jwt_required()
def create_user():
    """创建用户"""
    current_user = get_jwt_identity()
    if not check_permission(current_user['role'], ['admin']):
        return jsonify({'error': '权限不足'}), 403
    
    data = request.json
    db = get_db()
    
    # 检查用户名是否已存在
    if db.query(User).filter(User.username == data['username']).first():
        db.close()
        return jsonify({'error': '用户名已存在'}), 400
    
    user = User(
        username=data['username'],
        password=hash_password(data['password']),
        name=data['name'],
        dept_id=data.get('dept_id'),
        role=data.get('role', 'employee'),
        phone=data.get('phone'),
        email=data.get('email')
    )
    
    db.add(user)
    db.commit()
    db.close()
    
    return jsonify({'message': '用户创建成功', 'id': user.id}), 201

# ============================================
# 年度目标接口
# ============================================

@app.route('/api/goals', methods=['GET'])
@jwt_required()
def get_goals():
    """获取年度目标列表"""
    current_user = get_jwt_identity()
    year = request.args.get('year', datetime.now().year, type=int)
    
    db = get_db()
    query = db.query(AnnualGoal).filter(AnnualGoal.year == year)
    
    # 权限过滤：普通用户只能看本部门
    if current_user['role'] == 'manager':
        query = query.filter(AnnualGoal.dept_id == current_user['dept_id'])
    elif current_user['role'] == 'employee':
        query = query.filter(AnnualGoal.dept_id == current_user['dept_id'])
    
    goals = query.all()
    
    result = []
    for goal in goals:
        dept = db.query(Department).filter(Department.id == goal.dept_id).first()
        result.append({
            'id': goal.id,
            'year': goal.year,
            'dept_id': goal.dept_id,
            'dept_name': dept.name if dept else None,
            'indicator_name': goal.indicator_name,
            'target_value': goal.target_value,
            'actual_value': goal.actual_value,
            'weight': goal.weight,
            'achievement_rate': goal.achievement_rate,
            'status': goal.status
        })
    
    db.close()
    return jsonify(result)

@app.route('/api/goals', methods=['POST'])
@jwt_required()
def create_goal():
    """创建年度目标"""
    current_user = get_jwt_identity()
    if not check_permission(current_user['role'], ['admin', 'director', 'manager']):
        return jsonify({'error': '权限不足'}), 403
    
    data = request.json
    db = get_db()
    
    goal = AnnualGoal(
        year=data['year'],
        dept_id=data['dept_id'],
        indicator_name=data['indicator_name'],
        target_value=data['target_value'],
        weight=data.get('weight', 0),
        q1_target=data.get('q1_target'),
        q2_target=data.get('q2_target'),
        q3_target=data.get('q3_target'),
        q4_target=data.get('q4_target')
    )
    
    db.add(goal)
    db.commit()
    db.close()
    
    return jsonify({'message': '目标创建成功', 'id': goal.id}), 201

@app.route('/api/goals/<int:goal_id>', methods=['PUT'])
@jwt_required()
def update_goal(goal_id):
    """更新年度目标"""
    current_user = get_jwt_identity()
    
    db = get_db()
    goal = db.query(AnnualGoal).filter(AnnualGoal.id == goal_id).first()
    
    if not goal:
        db.close()
        return jsonify({'error': '目标不存在'}), 404
    
    data = request.json
    
    # 更新字段
    if 'actual_value' in data:
        goal.actual_value = data['actual_value']
        # 计算达成率
        if goal.target_value and goal.target_value > 0:
            goal.achievement_rate = round((data['actual_value'] / goal.target_value) * 100, 2)
    
    if 'status' in data:
        goal.status = data['status']
    
    db.commit()
    db.close()
    
    return jsonify({'message': '目标更新成功'})

@app.route('/api/goals/progress', methods=['GET'])
@jwt_required()
def get_goal_progress():
    """获取目标进度统计"""
    year = request.args.get('year', datetime.now().year, type=int)
    
    db = get_db()
    goals = db.query(AnnualGoal).filter(AnnualGoal.year == year, AnnualGoal.status == 'executing').all()
    
    # 按部门统计
    dept_progress = {}
    for goal in goals:
        dept = db.query(Department).filter(Department.id == goal.dept_id).first()
        dept_name = dept.name if dept else '未知'
        
        if dept_name not in dept_progress:
            dept_progress[dept_name] = {
                'total_targets': 0,
                'total_weight': 0,
                'weighted_achievement': 0
            }
        
        dept_progress[dept_name]['total_targets'] += 1
        dept_progress[dept_name]['total_weight'] += goal.weight or 0
        if goal.achievement_rate:
            dept_progress[dept_name]['weighted_achievement'] += goal.achievement_rate * (goal.weight or 0)
    
    # 计算加权平均达成率
    result = []
    for dept_name, data in dept_progress.items():
        avg_rate = data['weighted_achievement'] / data['total_weight'] if data['total_weight'] > 0 else 0
        result.append({
            'dept_name': dept_name,
            'total_targets': data['total_targets'],
            'avg_achievement_rate': round(avg_rate, 2)
        })
    
    db.close()
    return jsonify(result)

# ============================================
# 月度计划接口
# ============================================

@app.route('/api/plans', methods=['GET'])
@jwt_required()
def get_plans():
    """获取月度计划列表"""
    current_user = get_jwt_identity()
    year_month = request.args.get('year_month')
    
    db = get_db()
    query = db.query(MonthlyPlan)
    
    if year_month:
        query = query.filter(MonthlyPlan.year_month == year_month)
    
    # 权限过滤
    if current_user['role'] == 'manager':
        query = query.filter(MonthlyPlan.dept_id == current_user['dept_id'])
    elif current_user['role'] == 'employee':
        query = query.filter(MonthlyPlan.dept_id == current_user['dept_id'])
    
    plans = query.all()
    
    result = []
    for plan in plans:
        dept = db.query(Department).filter(Department.id == plan.dept_id).first()
        submitter = db.query(User).filter(User.id == plan.submitter_id).first()
        
        result.append({
            'id': plan.id,
            'year_month': plan.year_month,
            'dept_id': plan.dept_id,
            'dept_name': dept.name if dept else None,
            'submitter_name': submitter.name if submitter else None,
            'plan_item': plan.plan_item,
            'target_value': plan.target_value,
            'priority': plan.priority,
            'approval_status': plan.approval_status,
            'execution_status': plan.execution_status,
            'completion_rate': plan.completion_rate,
            'deadline': plan.deadline.isoformat() if plan.deadline else None
        })
    
    db.close()
    return jsonify(result)

@app.route('/api/plans', methods=['POST'])
@jwt_required()
def create_plan():
    """创建月度计划"""
    current_user = get_jwt_identity()
    data = request.json
    
    db = get_db()
    
    plan = MonthlyPlan(
        year_month=data['year_month'],
        dept_id=data.get('dept_id', current_user['dept_id']),
        submitter_id=current_user['id'],
        plan_item=data['plan_item'],
        target_value=data.get('target_value'),
        responsible_id=data.get('responsible_id'),
        budget=data.get('budget'),
        deadline=datetime.strptime(data['deadline'], '%Y-%m-%d') if data.get('deadline') else None,
        priority=data.get('priority', 'medium')
    )
    
    db.add(plan)
    db.commit()
    db.close()
    
    return jsonify({'message': '计划创建成功', 'id': plan.id}), 201

@app.route('/api/plans/<int:plan_id>/approve', methods=['PUT'])
@jwt_required()
def approve_plan(plan_id):
    """审批月度计划"""
    current_user = get_jwt_identity()
    if not check_permission(current_user['role'], ['admin', 'director']):
        return jsonify({'error': '权限不足'}), 403
    
    data = request.json
    db = get_db()
    
    plan = db.query(MonthlyPlan).filter(MonthlyPlan.id == plan_id).first()
    if not plan:
        db.close()
        return jsonify({'error': '计划不存在'}), 404
    
    plan.approval_status = data['approval_status']
    plan.approval_comment = data.get('approval_comment')
    plan.approver_id = current_user['id']
    plan.approval_time = datetime.utcnow()
    
    db.commit()
    db.close()
    
    return jsonify({'message': '审批成功'})

@app.route('/api/plans/track', methods=['GET'])
@jwt_required()
def track_plans():
    """跟踪计划执行情况"""
    year_month = request.args.get('year_month')
    
    db = get_db()
    query = db.query(MonthlyPlan).filter(MonthlyPlan.approval_status == 'approved')
    
    if year_month:
        query = query.filter(MonthlyPlan.year_month == year_month)
    
    plans = query.all()
    
    # 统计执行情况
    status_count = {
        'not_started': 0,
        'in_progress': 0,
        'completed': 0,
        'delayed': 0
    }
    
    overdue_plans = []
    for plan in plans:
        status_count[plan.execution_status] = status_count.get(plan.execution_status, 0) + 1
        
        # 检查是否逾期
        if plan.deadline and plan.execution_status != 'completed':
            if datetime.now().date() > plan.deadline:
                overdue_plans.append({
                    'id': plan.id,
                    'plan_item': plan.plan_item,
                    'deadline': plan.deadline.isoformat()
                })
    
    db.close()
    
    return jsonify({
        'status_count': status_count,
        'overdue_plans': overdue_plans
    })

# ============================================
# 周报接口
# ============================================

@app.route('/api/reports', methods=['GET'])
@jwt_required()
def get_reports():
    """获取周报列表"""
    current_user = get_jwt_identity()
    week_date = request.args.get('week_date')
    
    db = get_db()
    query = db.query(WeeklyReport)
    
    if week_date:
        query = query.filter(WeeklyReport.week_date == datetime.strptime(week_date, '%Y-%m-%d').date())
    
    # 权限过滤
    if current_user['role'] == 'manager':
        query = query.filter(WeeklyReport.dept_id == current_user['dept_id'])
    elif current_user['role'] == 'employee':
        query = query.filter(WeeklyReport.submitter_id == current_user['id'])
    
    reports = query.order_by(WeeklyReport.week_date.desc()).all()
    
    result = []
    for report in reports:
        dept = db.query(Department).filter(Department.id == report.dept_id).first()
        submitter = db.query(User).filter(User.id == report.submitter_id).first()
        
        result.append({
            'id': report.id,
            'week_date': report.week_date.isoformat(),
            'dept_id': report.dept_id,
            'dept_name': dept.name if dept else None,
            'submitter_name': submitter.name if submitter else None,
            'completed_items': report.completed_items,
            'key_data': report.key_data,
            'next_week_plans': report.next_week_plans,
            'issues': report.issues,
            'self_evaluation': report.self_evaluation,
            'ai_summary': report.ai_summary,
            'submitted_at': report.submitted_at.isoformat() if report.submitted_at else None
        })
    
    db.close()
    return jsonify(result)

@app.route('/api/reports', methods=['POST'])
@jwt_required()
def create_report():
    """提交周报"""
    current_user = get_jwt_identity()
    data = request.json
    
    db = get_db()
    
    report = WeeklyReport(
        week_date=datetime.strptime(data['week_date'], '%Y-%m-%d').date(),
        dept_id=data.get('dept_id', current_user['dept_id']),
        submitter_id=current_user['id'],
        completed_items=data.get('completed_items'),
        key_data=data.get('key_data'),
        next_week_plans=data.get('next_week_plans'),
        issues=data.get('issues'),
        self_evaluation=data.get('self_evaluation'),
        submitted_at=datetime.utcnow()
    )
    
    db.add(report)
    db.commit()
    db.close()
    
    return jsonify({'message': '周报提交成功', 'id': report.id}), 201

@app.route('/api/reports/summary', methods=['GET'])
@jwt_required()
def get_report_summary():
    """获取周报汇总"""
    week_date = request.args.get('week_date')
    
    db = get_db()
    query = db.query(WeeklyReport)
    
    if week_date:
        query = query.filter(WeeklyReport.week_date == datetime.strptime(week_date, '%Y-%m-%d').date())
    
    reports = query.all()
    
    # 汇总各部门周报
    summary = []
    for report in reports:
        dept = db.query(Department).filter(Department.id == report.dept_id).first()
        summary.append({
            'dept_name': dept.name if dept else '未知',
            'completed_items': report.completed_items,
            'key_data': report.key_data,
            'issues': report.issues,
            'ai_summary': report.ai_summary
        })
    
    db.close()
    return jsonify(summary)

# ============================================
# 问题清单接口
# ============================================

@app.route('/api/issues', methods=['GET'])
@jwt_required()
def get_issues():
    """获取问题列表"""
    current_user = get_jwt_identity()
    status = request.args.get('status')
    severity = request.args.get('severity')
    
    db = get_db()
    query = db.query(Issue)
    
    if status:
        query = query.filter(Issue.status == status)
    if severity:
        query = query.filter(Issue.severity == severity)
    
    # 权限过滤
    if current_user['role'] == 'manager':
        query = query.filter(Issue.dept_id == current_user['dept_id'])
    elif current_user['role'] == 'employee':
        query = query.filter(Issue.responsible_id == current_user['id'])
    
    issues = query.order_by(Issue.discovered_at.desc()).all()
    
    result = []
    for issue in issues:
        dept = db.query(Department).filter(Department.id == issue.dept_id).first()
        responsible = db.query(User).filter(User.id == issue.responsible_id).first()
        
        result.append({
            'id': issue.id,
            'issue_no': issue.issue_no,
            'dept_id': issue.dept_id,
            'dept_name': dept.name if dept else None,
            'description': issue.description,
            'category': issue.category,
            'severity': issue.severity,
            'responsible_name': responsible.name if responsible else None,
            'status': issue.status,
            'discovered_at': issue.discovered_at.isoformat(),
            'planned_finish': issue.planned_finish.isoformat() if issue.planned_finish else None
        })
    
    db.close()
    return jsonify(result)

@app.route('/api/issues', methods=['POST'])
@jwt_required()
def create_issue():
    """创建问题"""
    current_user = get_jwt_identity()
    data = request.json
    
    db = get_db()
    
    issue = Issue(
        issue_no=generate_issue_no(),
        source=data.get('source', 'manual'),
        discovered_at=datetime.strptime(data['discovered_at'], '%Y-%m-%d').date(),
        dept_id=data['dept_id'],
        description=data['description'],
        category=data.get('category'),
        severity=data.get('severity', 'medium'),
        responsible_id=data.get('responsible_id'),
        planned_finish=datetime.strptime(data['planned_finish'], '%Y-%m-%d').date() if data.get('planned_finish') else None,
        created_by=current_user['id']
    )
    
    db.add(issue)
    db.commit()
    db.close()
    
    return jsonify({'message': '问题创建成功', 'issue_no': issue.issue_no}), 201

@app.route('/api/issues/<int:issue_id>', methods=['PUT'])
@jwt_required()
def update_issue(issue_id):
    """更新问题状态"""
    current_user = get_jwt_identity()
    data = request.json
    
    db = get_db()
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    
    if not issue:
        db.close()
        return jsonify({'error': '问题不存在'}), 404
    
    if 'status' in data:
        issue.status = data['status']
    if 'solution' in data:
        issue.solution = data['solution']
    if 'actual_finish' in data:
        issue.actual_finish = datetime.strptime(data['actual_finish'], '%Y-%m-%d').date()
    
    db.commit()
    db.close()
    
    return jsonify({'message': '问题更新成功'})

@app.route('/api/issues/alerts', methods=['GET'])
@jwt_required()
def get_issue_alerts():
    """获取预警问题"""
    db = get_db()
    
    # 高优先级未处理问题
    high_priority = db.query(Issue).filter(
        Issue.severity == 'high',
        Issue.status == 'pending'
    ).all()
    
    # 逾期问题
    overdue = db.query(Issue).filter(
        Issue.status.in_(['pending', 'in_progress']),
        Issue.planned_finish < datetime.now().date()
    ).all()
    
    # 长期未解决问题（超过14天）
    long_term = db.query(Issue).filter(
        Issue.status.in_(['pending', 'in_progress']),
        Issue.discovered_at < (datetime.now() - timedelta(days=14)).date()
    ).all()
    
    def format_issues(issues):
        result = []
        for issue in issues:
            dept = db.query(Department).filter(Department.id == issue.dept_id).first()
            result.append({
                'id': issue.id,
                'issue_no': issue.issue_no,
                'dept_name': dept.name if dept else None,
                'description': issue.description[:50] + '...' if len(issue.description) > 50 else issue.description,
                'discovered_at': issue.discovered_at.isoformat()
            })
        return result
    
    db.close()
    
    return jsonify({
        'high_priority': format_issues(high_priority),
        'overdue': format_issues(overdue),
        'long_term': format_issues(long_term)
    })

# ============================================
# 月度数据接口
# ============================================

@app.route('/api/analysis/monthly', methods=['GET'])
@jwt_required()
def get_monthly_data():
    """获取月度经营数据"""
    year_month = request.args.get('year_month')
    
    db = get_db()
    query = db.query(MonthlyData)
    
    if year_month:
        query = query.filter(MonthlyData.year_month == year_month)
    
    data_list = query.all()
    
    result = []
    for data in data_list:
        dept = db.query(Department).filter(Department.id == data.dept_id).first()
        result.append({
            'id': data.id,
            'year_month': data.year_month,
            'dept_id': data.dept_id,
            'dept_name': dept.name if dept else None,
            'indicator_name': data.indicator_name,
            'monthly_target': data.monthly_target,
            'monthly_actual': data.monthly_actual,
            'achievement_rate': data.achievement_rate,
            'yoy_growth': data.yoy_growth,
            'mom_growth': data.mom_growth,
            'deviation_reason': data.deviation_reason,
            'improvement_measure': data.improvement_measure
        })
    
    db.close()
    return jsonify(result)

@app.route('/api/analysis/monthly', methods=['POST'])
@jwt_required()
def create_monthly_data():
    """录入月度经营数据"""
    current_user = get_jwt_identity()
    if not check_permission(current_user['role'], ['admin', 'director', 'manager']):
        return jsonify({'error': '权限不足'}), 403
    
    data = request.json
    db = get_db()
    
    monthly_data = MonthlyData(
        year_month=data['year_month'],
        dept_id=data['dept_id'],
        indicator_name=data['indicator_name'],
        monthly_target=data.get('monthly_target'),
        monthly_actual=data.get('monthly_actual'),
        last_year_actual=data.get('last_year_actual'),
        last_month_actual=data.get('last_month_actual'),
        deviation_reason=data.get('deviation_reason'),
        improvement_measure=data.get('improvement_measure'),
        created_by=current_user['id']
    )
    
    # 计算达成率
    if monthly_data.monthly_target and monthly_data.monthly_actual:
        monthly_data.achievement_rate = round((monthly_data.monthly_actual / monthly_data.monthly_target) * 100, 2)
    
    # 计算同比增长
    if monthly_data.last_year_actual and monthly_data.monthly_actual:
        monthly_data.yoy_growth = round(((monthly_data.monthly_actual - monthly_data.last_year_actual) / monthly_data.last_year_actual) * 100, 2)
    
    # 计算环比增长
    if monthly_data.last_month_actual and monthly_data.monthly_actual:
        monthly_data.mom_growth = round(((monthly_data.monthly_actual - monthly_data.last_month_actual) / monthly_data.last_month_actual) * 100, 2)
    
    db.add(monthly_data)
    db.commit()
    db.close()
    
    return jsonify({'message': '数据录入成功', 'id': monthly_data.id}), 201

# ============================================
# 运营驾驶舱接口
# ============================================

@app.route('/api/dashboard', methods=['GET'])
@jwt_required()
def get_dashboard():
    """获取运营驾驶舱数据"""
    current_user = get_jwt_identity()
    db = get_db()
    
    # 当前年月
    current_year = datetime.now().year
    current_month = datetime.now().strftime('%Y-%m')
    
    # 获取各部门核心指标
    departments = db.query(Department).filter(Department.status == 'active').all()
    
    dashboard_data = []
    for dept in departments:
        # 年度目标
        goals = db.query(AnnualGoal).filter(
            AnnualGoal.dept_id == dept.id,
            AnnualGoal.year == current_year
        ).all()
        
        # 月度计划
        plans = db.query(MonthlyPlan).filter(
            MonthlyPlan.dept_id == dept.id,
            MonthlyPlan.year_month == current_month
        ).all()
        
        # 问题
        issues = db.query(Issue).filter(
            Issue.dept_id == dept.id,
            Issue.status.in_(['pending', 'in_progress'])
        ).all()
        
        # 计算平均达成率
        avg_achievement = 0
        if goals:
            total_rate = sum([g.achievement_rate or 0 for g in goals])
            avg_achievement = round(total_rate / len(goals), 2)
        
        # 计算计划完成率
        plan_completion = 0
        if plans:
            completed = len([p for p in plans if p.execution_status == 'completed'])
            plan_completion = round((completed / len(plans)) * 100, 2)
        
        dashboard_data.append({
            'dept_id': dept.id,
            'dept_name': dept.name,
            'goals_count': len(goals),
            'avg_achievement_rate': avg_achievement,
            'plans_count': len(plans),
            'plan_completion_rate': plan_completion,
            'open_issues': len(issues),
            'high_severity_issues': len([i for i in issues if i.severity == 'high'])
        })
    
    # 获取预警信息
    alerts = {
        'high_priority_issues': db.query(Issue).filter(Issue.severity == 'high', Issue.status == 'pending').count(),
        'overdue_plans': db.query(MonthlyPlan).filter(
            MonthlyPlan.execution_status != 'completed',
            MonthlyPlan.deadline < datetime.now().date()
        ).count()
    }
    
    db.close()
    
    return jsonify({
        'departments': dashboard_data,
        'alerts': alerts,
        'current_month': current_month
    })

# ============================================
# 启动服务
# ============================================

if __name__ == '__main__':
    # 初始化管理员账号
    db = get_db()
    if not db.query(User).filter(User.username == 'admin').first():
        admin = User(
            username='admin',
            password=hash_password('admin123'),
            name='系统管理员',
            role='admin'
        )
        db.add(admin)
        db.commit()
        print("管理员账号已创建：admin / admin123")
    db.close()
    
    app.run(host='0.0.0.0', port=5000, debug=True)
