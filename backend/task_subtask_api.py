"""
ACEMATIC运营管理系统 - Phase 1 子任务功能模块
基于 PRD v2.1 设计实现
新增：Task表（支持子任务分解）、权限控制增强、进度自动计算

使用方式：将本文件内容合并到 app.py 的数据模型和API部分
"""

# ============================================
# Phase 1 新增数据模型
# ============================================

class Task(Base):
    """任务表 - 支持多级子任务分解"""
    __tablename__ = 'tasks'

    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # 基础信息
    title = Column(String(200), nullable=False)
    description = Column(Text)
    
    # 来源追溯（PRD要求每个任务必须有明确来源）
    source_type = Column(String(30), nullable=False, default='assigned')
    # 来源类型: assigned(上级分配) / self_initiated(主动申请) / plan_decomposition(计划分解) / task_decomposition(任务分解)
    source_id = Column(Integer)  # 关联来源对象的ID
    source_description = Column(Text)  # 来源说明
    
    # 权限信息
    creator_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    assignee_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    # 子任务关联（PRD v2.1核心）
    parent_task_id = Column(Integer, ForeignKey('tasks.id'), nullable=True)
    is_parent_task = Column(Integer, default=0)  # 0=否, 1=是
    subtask_count = Column(Integer, default=0)
    completed_subtask_count = Column(Integer, default=0)
    subtask_weight_mode = Column(String(10), default='equal')  # equal(均等) / manual(手动) / time(工时)
    current_level = Column(Integer, default=1)  # 任务层级，1=顶级任务
    subtask_weight = Column(Float, default=0)  # 在父任务中的权重
    max_subtask_level = Column(Integer, default=3)  # 最大允许嵌套层级
    
    # 关联目标（战略对齐）
    strategy_id = Column(Integer)  # 关联的战略目标ID
    plan_id = Column(Integer)  # 关联的计划ID
    alignment_score = Column(Float, default=0)  # 战略对齐度
    
    # 进度信息
    progress = Column(Integer, default=0)  # 0-100
    progress_calculation = Column(String(10), default='manual')  # manual(手动) / auto(自动-根据子任务计算)
    
    # 状态
    status = Column(String(20), default='pending')
    # pending(待确认) / confirmed(已确认) / in_progress(进行中) / submitted(待验收) / 
    # completed(已完成) / rejected(已拒绝) / returned(需修改) / paused(已暂停) / transferred(已转派)
    
    priority = Column(String(10), default='medium')  # high/medium/low
    
    # 时间
    start_date = Column(Date)
    due_date = Column(Date)
    estimated_hours = Column(Float)  # 预估工时（用于时间权重模式）
    actual_hours = Column(Float)  # 实际工时
    
    # 审批
    approval_status = Column(String(20), default='none')  # none/pending/approved/rejected
    rejection_reason = Column(Text)
    
    # 验收
    submit_complete_at = Column(DateTime)  # 提交完成时间
    verified_by = Column(Integer, ForeignKey('users.id'))  # 验收人
    verified_at = Column(DateTime)  # 验收时间
    verification_comment = Column(Text)  # 验收意见
    
    # 标记
    can_complete = Column(Integer, default=0)  # 是否可提交完成（子任务全完成时为1）
    
    # 元数据
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关系
    children = relationship("Task", backref=db.backref('parent', remote_side='Task.id'), lazy='dynamic')


class TaskProgressLog(Base):
    """任务进度日志 - 记录每次进度更新"""
    __tablename__ = 'task_progress_logs'

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(Integer, ForeignKey('tasks.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    old_progress = Column(Integer, default=0)
    new_progress = Column(Integer, default=0)
    description = Column(Text)  # 进度描述/备注
    
    created_at = Column(DateTime, default=datetime.utcnow)


class TaskComment(Base):
    """任务评论 - 用于反馈和指导"""
    __tablename__ = 'task_comments'

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(Integer, ForeignKey('tasks.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    content = Column(Text, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)


# ============================================
# Phase 1 子任务进度计算引擎
# ============================================

def calculate_parent_progress(db, task_id):
    """
    根据子任务进度自动计算父任务进度
    公式：父进度 = Σ(子进度 × 子权重) / Σ(子权重)
    同时更新 can_complete 标志
    """
    parent = db.query(Task).filter(Task.id == task_id).first()
    if not parent or not parent.is_parent_task:
        return parent.progress if parent else 0
    
    children = db.query(Task).filter(Task.parent_task_id == task_id).all()
    if not children:
        parent.progress = 0
        parent.can_complete = 1  # 无子任务，可提交
        return parent.progress
    
    total_weight = 0
    weighted_progress = 0
    all_completed = True
    completed_count = 0
    
    for child in children:
        weight = child.subtask_weight if child.subtask_weight else 1
        total_weight += weight
        weighted_progress += (child.progress or 0) * weight
        
        if child.status != 'completed':
            all_completed = False
        else:
            completed_count += 1
    
    if total_weight > 0:
        parent.progress = int(weighted_progress / total_weight)
    else:
        parent.progress = 0
    
    parent.completed_subtask_count = completed_count
    parent.subtask_count = len(children)
    parent.can_complete = 1 if all_completed else 0
    
    db.commit()
    
    # 递归更新祖父任务
    if parent.parent_task_id:
        calculate_parent_progress(db, parent.parent_task_id)
    
    return parent.progress


def check_task_permission(db, user, task, action):
    """
    检查用户对任务的操作权限
    返回 (has_permission: bool, error_msg: str)
    """
    if not task:
        return False, "任务不存在"
    
    # 管理员/总经理拥有所有权限
    if user['role'] in ['admin']:
        return True, ""
    
    # 查看权限：创建者、执行者、上级领导
    if action == 'view':
        if task.creator_id == user['id']:
            return True, ""
        if task.assignee_id == user['id']:
            return True, ""
        # 检查是否是上级（通过部门层级）
        assignee = db.query(User).filter(User.id == task.assignee_id).first()
        if assignee and assignee.manager_id == user['id']:
            return True, ""
        return False, "无权查看该任务"
    
    # 分解子任务：仅执行者
    if action == 'decompose':
        if task.assignee_id == user['id']:
            return True, ""
        return False, "仅任务执行者可以分解子任务"
    
    # 更新进度：仅执行者
    if action == 'update_progress':
        if task.assignee_id == user['id']:
            return True, ""
        return False, "仅任务执行者可以更新进度"
    
    # 验收：创建者或上级领导
    if action == 'verify':
        if task.creator_id == user['id']:
            return True, ""
        # 子任务的验收由父任务执行者进行
        if task.parent_task_id:
            parent = db.query(Task).filter(Task.id == task.parent_task_id).first()
            if parent and parent.assignee_id == user['id']:
                return True, ""
        # 上级领导验收
        assignee = db.query(User).filter(User.id == task.assignee_id).first()
        if assignee and assignee.manager_id == user['id']:
            return True, ""
        return False, "无权验收该任务"
    
    # 编辑/删除/重新分配：仅创建者
    if action in ['edit', 'delete', 'reassign']:
        if task.creator_id == user['id']:
            return True, ""
        return False, "仅任务创建者可以执行此操作"
    
    return False, "未知操作"


# ============================================
# Phase 1 任务API接口
# ============================================

@app.route('/api/tasks', methods=['GET'])
@jwt_required()
def get_tasks():
    """获取任务列表"""
    current_user = get_jwt_identity()
    db = get_db()
    
    query = db.query(Task)
    
    # 筛选条件
    status = request.args.get('status')
    priority = request.args.get('priority')
    assignee_id = request.args.get('assignee_id', type=int)
    parent_id = request.args.get('parent_id', type=int)
    source_type = request.args.get('source_type')
    is_parent = request.args.get('is_parent', type=int)
    
    if status:
        query = query.filter(Task.status == status)
    if priority:
        query = query.filter(Task.priority == priority)
    if assignee_id:
        query = query.filter(Task.assignee_id == assignee_id)
    if parent_id is not None:
        if parent_id == 0:
            query = query.filter(Task.parent_task_id.is_(None))
        else:
            query = query.filter(Task.parent_task_id == parent_id)
    if source_type:
        query = query.filter(Task.source_type == source_type)
    if is_parent is not None:
        query = query.filter(Task.is_parent_task == is_parent)
    
    # 权限过滤：普通员工只看自己的任务
    if current_user['role'] == 'employee':
        query = query.filter(
            (Task.assignee_id == current_user['id']) | 
            (Task.creator_id == current_user['id'])
        )
    elif current_user['role'] == 'manager':
        # 部门经理看本部门+自己相关
        query = query.filter(
            (Task.assignee_id == current_user['id']) |
            (Task.creator_id == current_user['id']) |
            (Task.source_type == 'plan_decomposition')  # 计划分解的任务对本部门可见
        )
    
    tasks = query.order_by(Task.created_at.desc()).all()
    
    result = []
    for task in tasks:
        creator = db.query(User).filter(User.id == task.creator_id).first()
        assignee = db.query(User).filter(User.id == task.assignee_id).first()
        
        task_dict = {
            'id': task.id,
            'title': task.title,
            'description': task.description,
            'source_type': task.source_type,
            'source_id': task.source_id,
            'source_description': task.source_description,
            'creator_id': task.creator_id,
            'creator_name': creator.name if creator else None,
            'assignee_id': task.assignee_id,
            'assignee_name': assignee.name if assignee else None,
            'parent_task_id': task.parent_task_id,
            'is_parent_task': task.is_parent_task,
            'subtask_count': task.subtask_count,
            'completed_subtask_count': task.completed_subtask_count,
            'current_level': task.current_level,
            'subtask_weight': task.subtask_weight,
            'strategy_id': task.strategy_id,
            'plan_id': task.plan_id,
            'progress': task.progress,
            'progress_calculation': task.progress_calculation,
            'status': task.status,
            'priority': task.priority,
            'start_date': task.start_date.isoformat() if task.start_date else None,
            'due_date': task.due_date.isoformat() if task.due_date else None,
            'estimated_hours': task.estimated_hours,
            'actual_hours': task.actual_hours,
            'can_complete': task.can_complete,
            'created_at': task.created_at.isoformat() if task.created_at else None,
        }
        result.append(task_dict)
    
    db.close()
    return jsonify(result)


@app.route('/api/tasks', methods=['POST'])
@jwt_required()
def create_task():
    """创建任务"""
    current_user = get_jwt_identity()
    data = request.json
    db = get_db()
    
    task = Task(
        title=data['title'],
        description=data.get('description'),
        source_type=data.get('source_type', 'assigned'),
        source_id=data.get('source_id'),
        source_description=data.get('source_description'),
        creator_id=current_user['id'],
        assignee_id=data['assignee_id'],
        parent_task_id=data.get('parent_task_id'),
        strategy_id=data.get('strategy_id'),
        plan_id=data.get('plan_id'),
        priority=data.get('priority', 'medium'),
        start_date=datetime.strptime(data['start_date'], '%Y-%m-%d').date() if data.get('start_date') else None,
        due_date=datetime.strptime(data['due_date'], '%Y-%m-%d').date() if data.get('due_date') else None,
        estimated_hours=data.get('estimated_hours'),
        status='pending',
        progress=0,
        is_parent_task=0,
        current_level=1,
    )
    
    # 如果是作为子任务创建
    if data.get('parent_task_id'):
        parent = db.query(Task).filter(Task.id == data['parent_task_id']).first()
        if parent:
            # 权限检查：只有父任务执行者可以分解
            has_perm, msg = check_task_permission(db, current_user, parent, 'decompose')
            if not has_perm:
                db.close()
                return jsonify({'error': msg}), 403
            
            task.current_level = (parent.current_level or 1) + 1
            
            # 检查层级限制
            if task.current_level > (parent.max_subtask_level or 3):
                db.close()
                return jsonify({'error': f'任务嵌套层级不能超过{parent.max_subtask_level or 3}层'}), 400
            
            # 标记父任务为父任务
            if not parent.is_parent_task:
                parent.is_parent_task = 1
            
            # 设置权重
            task.subtask_weight = data.get('subtask_weight', 0)
            
            # 重新计算子任务权重（如果模式为均等）
            if (parent.subtask_weight_mode == 'equal'):
                parent.subtask_count = (parent.subtask_count or 0) + 1
                # 权重在创建完成后统一计算
    
    db.add(task)
    db.commit()
    
    # 如果是子任务，重新计算父任务权重
    if data.get('parent_task_id'):
        parent_id = data['parent_task_id']
        parent = db.query(Task).filter(Task.id == parent_id).first()
        if parent and parent.subtask_weight_mode == 'equal':
            _recalculate_equal_weights(db, parent_id)
        calculate_parent_progress(db, parent_id)
    
    db.close()
    return jsonify({'message': '任务创建成功', 'id': task.id, 'task': {
        'id': task.id, 'title': task.title, 'parent_task_id': task.parent_task_id,
        'current_level': task.current_level, 'status': task.status
    }}), 201


def _recalculate_equal_weights(db, parent_id):
    """均等权重模式：自动平均分配权重"""
    children = db.query(Task).filter(Task.parent_task_id == parent_id).all()
    if not children:
        return
    weight = round(100 / len(children), 2)
    for child in children:
        child.subtask_weight = weight
    db.commit()


@app.route('/api/tasks/<int:task_id>', methods=['GET'])
@jwt_required()
def get_task_detail(task_id):
    """获取任务详情（含子任务列表）"""
    current_user = get_jwt_identity()
    db = get_db()
    
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        db.close()
        return jsonify({'error': '任务不存在'}), 404
    
    # 权限检查
    has_perm, msg = check_task_permission(db, current_user, task, 'view')
    if not has_perm:
        db.close()
        return jsonify({'error': msg}), 403
    
    creator = db.query(User).filter(User.id == task.creator_id).first()
    assignee = db.query(User).filter(User.id == task.assignee_id).first()
    
    result = {
        'id': task.id,
        'title': task.title,
        'description': task.description,
        'source_type': task.source_type,
        'source_id': task.source_id,
        'source_description': task.source_description,
        'creator_id': task.creator_id,
        'creator_name': creator.name if creator else None,
        'assignee_id': task.assignee_id,
        'assignee_name': assignee.name if assignee else None,
        'parent_task_id': task.parent_task_id,
        'is_parent_task': task.is_parent_task,
        'subtask_count': task.subtask_count,
        'completed_subtask_count': task.completed_subtask_count,
        'subtask_weight_mode': task.subtask_weight_mode,
        'current_level': task.current_level,
        'subtask_weight': task.subtask_weight,
        'max_subtask_level': task.max_subtask_level,
        'strategy_id': task.strategy_id,
        'plan_id': task.plan_id,
        'progress': task.progress,
        'progress_calculation': task.progress_calculation,
        'status': task.status,
        'priority': task.priority,
        'start_date': task.start_date.isoformat() if task.start_date else None,
        'due_date': task.due_date.isoformat() if task.due_date else None,
        'estimated_hours': task.estimated_hours,
        'actual_hours': task.actual_hours,
        'approval_status': task.approval_status,
        'rejection_reason': task.rejection_reason,
        'submit_complete_at': task.submit_complete_at.isoformat() if task.submit_complete_at else None,
        'verified_by': task.verified_by,
        'verified_at': task.verified_at.isoformat() if task.verified_at else None,
        'verification_comment': task.verification_comment,
        'can_complete': task.can_complete,
        'created_at': task.created_at.isoformat() if task.created_at else None,
        'updated_at': task.updated_at.isoformat() if task.updated_at else None,
    }
    
    # 获取子任务列表
    if task.is_parent_task:
        subtasks = db.query(Task).filter(Task.parent_task_id == task_id).order_by(Task.created_at).all()
        result['subtasks'] = [{
            'id': st.id,
            'title': st.title,
            'assignee_id': st.assignee_id,
            'assignee_name': db.query(User).filter(User.id == st.assignee_id).first().name if st.assignee_id else None,
            'subtask_weight': st.subtask_weight,
            'progress': st.progress,
            'status': st.status,
            'due_date': st.due_date.isoformat() if st.due_date else None,
        } for st in subtasks]
    
    # 获取进度日志
    logs = db.query(TaskProgressLog).filter(TaskProgressLog.task_id == task_id).order_by(TaskProgressLog.created_at.desc()).limit(20).all()
    result['progress_logs'] = [{
        'id': log.id,
        'user_id': log.user_id,
        'user_name': db.query(User).filter(User.id == log.user_id).first().name if log.user_id else None,
        'old_progress': log.old_progress,
        'new_progress': log.new_progress,
        'description': log.description,
        'created_at': log.created_at.isoformat() if log.created_at else None,
    } for log in logs]
    
    # 获取评论
    comments = db.query(TaskComment).filter(TaskComment.task_id == task_id).order_by(TaskComment.created_at.desc()).limit(50).all()
    result['comments'] = [{
        'id': c.id,
        'user_id': c.user_id,
        'user_name': db.query(User).filter(User.id == c.user_id).first().name if c.user_id else None,
        'content': c.content,
        'created_at': c.created_at.isoformat() if c.created_at else None,
    } for c in comments]
    
    db.close()
    return jsonify(result)


@app.route('/api/tasks/<int:task_id>/progress', methods=['PUT'])
@jwt_required()
def update_task_progress(task_id):
    """更新任务进度（仅执行者可操作）"""
    current_user = get_jwt_identity()
    data = request.json
    db = get_db()
    
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        db.close()
        return jsonify({'error': '任务不存在'}), 404
    
    # 权限检查：仅执行者可更新进度
    has_perm, msg = check_task_permission(db, current_user, task, 'update_progress')
    if not has_perm:
        db.close()
        return jsonify({'error': msg}), 403
    
    # 状态检查
    if task.status not in ['confirmed', 'in_progress', 'returned']:
        db.close()
        return jsonify({'error': f'当前状态({task.status})不允许更新进度'}), 400
    
    old_progress = task.progress
    new_progress = data.get('progress', task.progress)
    new_progress = max(0, min(100, int(new_progress)))
    
    task.progress = new_progress
    
    # 如果任务有父任务（是子任务），标记为手动计算
    if task.parent_task_id:
        task.progress_calculation = 'manual'
    
    # 自动更新状态
    if new_progress == 100:
        task.status = 'submitted'
        task.submit_complete_at = datetime.utcnow()
    elif new_progress > 0 and task.status == 'confirmed':
        task.status = 'in_progress'
    
    # 更新实际工时
    if data.get('actual_hours'):
        task.actual_hours = data.get('actual_hours')
    
    # 记录进度日志
    log = TaskProgressLog(
        task_id=task_id,
        user_id=current_user['id'],
        old_progress=old_progress,
        new_progress=new_progress,
        description=data.get('description', f'进度从{old_progress}%更新至{new_progress}%')
    )
    db.add(log)
    
    db.commit()
    
    # 如果是子任务，触发父任务进度重算
    if task.parent_task_id:
        parent_progress = calculate_parent_progress(db, task.parent_task_id)
        db.close()
        return jsonify({
            'message': '进度更新成功',
            'task_progress': new_progress,
            'parent_progress': parent_progress
        })
    
    db.close()
    return jsonify({'message': '进度更新成功', 'progress': new_progress})


@app.route('/api/tasks/<int:task_id>/confirm', methods=['PUT'])
@jwt_required()
def confirm_task(task_id):
    """确认接收任务"""
    current_user = get_jwt_identity()
    db = get_db()
    
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        db.close()
        return jsonify({'error': '任务不存在'}), 404
    
    if task.assignee_id != current_user['id']:
        db.close()
        return jsonify({'error': '只有被指派人可以确认接收'}), 403
    
    if task.status != 'pending':
        db.close()
        return jsonify({'error': f'当前状态({task.status})不允许确认接收'}), 400
    
    task.status = 'confirmed'
    if task.start_date is None:
        task.start_date = datetime.utcnow().date()
    
    db.commit()
    db.close()
    return jsonify({'message': '任务已确认接收', 'status': 'confirmed'})


@app.route('/api/tasks/<int:task_id>/reject', methods=['PUT'])
@jwt_required()
def reject_task(task_id):
    """拒绝任务"""
    current_user = get_jwt_identity()
    data = request.json
    db = get_db()
    
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        db.close()
        return jsonify({'error': '任务不存在'}), 404
    
    if task.assignee_id != current_user['id']:
        db.close()
        return jsonify({'error': '只有被指派人可以拒绝'}), 403
    
    task.status = 'rejected'
    task.rejection_reason = data.get('reason', '未说明原因')
    
    db.commit()
    db.close()
    return jsonify({'message': '任务已拒绝', 'status': 'rejected'})


@app.route('/api/tasks/<int:task_id>/submit', methods=['PUT'])
@jwt_required()
def submit_task(task_id):
    """提交任务完成（待验收）"""
    current_user = get_jwt_identity()
    db = get_db()
    
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        db.close()
        return jsonify({'error': '任务不存在'}), 404
    
    has_perm, msg = check_task_permission(db, current_user, task, 'update_progress')
    if not has_perm:
        db.close()
        return jsonify({'error': msg}), 403
    
    # 如果是父任务，检查所有子任务是否完成
    if task.is_parent_task and task.can_complete != 1:
        db.close()
        return jsonify({'error': '所有子任务完成前无法提交父任务'}), 400
    
    task.status = 'submitted'
    task.submit_complete_at = datetime.utcnow()
    task.progress = 100
    
    db.commit()
    db.close()
    return jsonify({'message': '任务已提交，等待验收', 'status': 'submitted'})


@app.route('/api/tasks/<int:task_id>/verify', methods=['PUT'])
@jwt_required()
def verify_task(task_id):
    """验收任务"""
    current_user = get_jwt_identity()
    data = request.json
    db = get_db()
    
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        db.close()
        return jsonify({'error': '任务不存在'}), 404
    
    has_perm, msg = check_task_permission(db, current_user, task, 'verify')
    if not has_perm:
        db.close()
        return jsonify({'error': msg}), 403
    
    action = data.get('action')  # approve / return / reject
    
    if action == 'approve':
        task.status = 'completed'
        task.verified_by = current_user['id']
        task.verified_at = datetime.utcnow()
        task.verification_comment = data.get('comment', '')
        task.progress = 100
        
        # 如果是子任务完成，触发父任务进度重算
        if task.parent_task_id:
            calculate_parent_progress(db, task.parent_task_id)
        
        db.commit()
        db.close()
        return jsonify({'message': '任务验收通过', 'status': 'completed'})
    
    elif action == 'return':
        task.status = 'returned'
        task.verification_comment = data.get('comment', '需要修改')
        task.progress = 80  # 退回时进度标记为80%
        
        # 如果是父任务被退回，更新can_complete
        if task.is_parent_task:
            task.can_complete = 0
        
        db.commit()
        db.close()
        return jsonify({'message': '任务已退回修改', 'status': 'returned'})
    
    elif action == 'reject':
        task.status = 'rejected'
        task.verification_comment = data.get('comment', '')
        
        db.commit()
        db.close()
        return jsonify({'message': '任务已驳回', 'status': 'rejected'})
    
    db.close()
    return jsonify({'error': '无效的验收操作'}), 400


@app.route('/api/tasks/<int:task_id>/subtasks/weights', methods=['PUT'])
@jwt_required()
def update_subtask_weights(task_id):
    """更新子任务权重分配"""
    current_user = get_jwt_identity()
    data = request.json
    db = get_db()
    
    parent = db.query(Task).filter(Task.id == task_id).first()
    if not parent:
        db.close()
        return jsonify({'error': '任务不存在'}), 404
    
    has_perm, msg = check_task_permission(db, current_user, parent, 'decompose')
    if not has_perm:
        db.close()
        return jsonify({'error': msg}), 403
    
    # 更新权重模式
    weight_mode = data.get('weight_mode')
    if weight_mode:
        parent.subtask_weight_mode = weight_mode
    
    # 更新各子任务权重
    weights = data.get('weights', {})  # {subtask_id: weight}
    for st_id, weight in weights.items():
        subtask = db.query(Task).filter(Task.id == int(st_id), Task.parent_task_id == task_id).first()
        if subtask:
            subtask.subtask_weight = float(weight)
    
    # 均等模式自动分配
    if parent.subtask_weight_mode == 'equal':
        _recalculate_equal_weights(db, task_id)
    
    db.commit()
    
    # 重算进度
    calculate_parent_progress(db, task_id)
    
    db.close()
    return jsonify({'message': '权重更新成功'})


@app.route('/api/tasks/<int:task_id>/comments', methods=['POST'])
@jwt_required()
def add_task_comment(task_id):
    """添加任务评论"""
    current_user = get_jwt_identity()
    data = request.json
    db = get_db()
    
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        db.close()
        return jsonify({'error': '任务不存在'}), 404
    
    has_perm, msg = check_task_permission(db, current_user, task, 'view')
    if not has_perm:
        db.close()
        return jsonify({'error': msg}), 403
    
    comment = TaskComment(
        task_id=task_id,
        user_id=current_user['id'],
        content=data['content']
    )
    db.add(comment)
    db.commit()
    
    user = db.query(User).filter(User.id == current_user['id']).first()
    db.close()
    
    return jsonify({
        'message': '评论添加成功',
        'comment': {
            'id': comment.id,
            'user_name': user.name if user else None,
            'content': comment.content,
            'created_at': comment.created_at.isoformat()
        }
    }), 201


@app.route('/api/tasks/stats', methods=['GET'])
@jwt_required()
def get_task_stats():
    """获取任务统计"""
    current_user = get_jwt_identity()
    db = get_db()
    
    query = db.query(Task)
    
    # 按权限过滤
    if current_user['role'] == 'employee':
        query = query.filter(
            (Task.assignee_id == current_user['id']) |
            (Task.creator_id == current_user['id'])
        )
    
    tasks = query.all()
    
    stats = {
        'total': len(tasks),
        'by_status': {},
        'by_priority': {},
        'overdue_count': 0,
        'completion_rate': 0,
    }
    
    completed_count = 0
    today = datetime.utcnow().date()
    
    for task in tasks:
        stats['by_status'][task.status] = stats['by_status'].get(task.status, 0) + 1
        stats['by_priority'][task.priority] = stats['by_priority'].get(task.priority, 0) + 1
        
        if task.status == 'completed':
            completed_count += 1
        
        if task.due_date and task.due_date < today and task.status not in ['completed', 'rejected']:
            stats['overdue_count'] += 1
    
    stats['completion_rate'] = round(completed_count / len(tasks) * 100, 1) if tasks else 0
    
    db.close()
    return jsonify(stats)
