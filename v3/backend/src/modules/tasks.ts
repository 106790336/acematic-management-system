import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';
import { authMiddleware, roleMiddleware, permissionMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// 获取任务列表
router.get('/', async (req: Request, res: Response) => {
  try {
    const { planId, status, assigneeId, search, page = 1, limit = 20 } = req.query;
    
    const where: any = {};
    
    if (planId) where.planId = planId as string;
    if (status) where.status = status as string;
    if (assigneeId) where.assigneeId = assigneeId as string;
    
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    // 权限控制：员工只能看自己创建和分配给自己的任务
    if (req.user!.role === 'employee') {
      where.OR = [
        { createdById: req.user!.id },
        { assigneeId: req.user!.id },
      ];
    }
    // 经理可以看到本部门的所有任务
    if (req.user!.role === 'manager') {
      const deptUsers = await prisma.user.findMany({
        where: { departmentId: req.user!.departmentId },
        select: { id: true }
      });
      const deptUserIds = deptUsers.map(u => u.id);
      where.OR = [
        { createdById: { in: deptUserIds } },
        { assigneeId: { in: deptUserIds } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    
    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          assignee: { select: { id: true, name: true } },
          plan: { select: { id: true, title: true } },
          createdBy: { select: { id: true, name: true } },
          submittedBy: { select: { id: true, name: true } },
          reviewedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.task.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        items: tasks,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ success: false, error: '获取任务列表失败' });
  }
});

// 获取任务详情
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, name: true, position: true } },
        plan: { select: { id: true, title: true, department: { select: { id: true, name: true } } } },
        createdBy: { select: { id: true, name: true } },
        submittedBy: { select: { id: true, name: true } },
        reviewedBy: { select: { id: true, name: true } },
      },
    });

    if (!task) {
      return res.status(404).json({ success: false, error: '任务不存在' });
    }

    // 权限检查
    const canView = 
      req.user!.role === 'ceo' || 
      req.user!.role === 'executive' ||
      task.createdById === req.user!.id ||
      task.assigneeId === req.user!.id;

    if (!canView) {
      return res.status(403).json({ success: false, error: '无权限查看此任务' });
    }

    res.json({ success: true, data: task });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ success: false, error: '获取任务信息失败' });
  }
});

// 创建任务（草稿）
router.post('/', permissionMiddleware('task:create'), async (req: Request, res: Response) => {
  try {
    const { title, description, planId, assigneeId, priority, dueDate } = req.body;
    
    // 生成唯一任务编号 T-年月日-随机数
    const taskCount = await prisma.task.count();
    const taskNumber = `T-${Date.now()}-${(taskCount + 1).toString().padStart(4, '0')}`;
    
    const task = await prisma.task.create({
      data: {
        title,
        description: description || '',
        taskNumber,
        planId: planId || null,
        assigneeId: assigneeId || req.user!.id,  // 默认分配给自己
        assignerId: req.user!.id,
        priority: priority || 'medium',
        dueDate: dueDate ? new Date(dueDate) : null,
        status: 'draft',
        progress: 0,
        createdById: req.user!.id,
      },
      include: {
        assignee: { select: { id: true, name: true } },
        plan: { select: { id: true, title: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    // 记录审计日志
    const { auditCreate } = await import('../utils/audit');
    await auditCreate(req, 'task', task.id, task.title, {
      title, description, planId, assigneeId, priority, dueDate, taskNumber, status: 'draft'
    });

    res.json({ success: true, data: task });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ success: false, error: '创建任务失败' });
  }
});

// 提交审核
router.post('/:id/submit', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const task = await prisma.task.findUnique({ where: { id } });
    
    if (!task) return res.status(404).json({ success: false, error: '任务不存在' });
    if (task.status !== 'draft') return res.status(400).json({ success: false, error: '只有草稿状态可以提交审核' });
    if (task.createdById !== req.user!.id) return res.status(403).json({ success: false, error: '只能提交自己创建的任务' });

    const updated = await prisma.task.update({
      where: { id },
      data: { 
        status: 'pending',
        submittedAt: new Date(),
        submittedById: req.user!.id,
      },
      include: {
        assignee: { select: { id: true, name: true } },
        plan: { select: { id: true, title: true } },
      },
    });

    // 记录审计日志
    const { auditStatusChange } = await import('../utils/audit');
    await auditStatusChange(req, 'task', id, task.title, 'draft', 'pending', `提交任务审核: ${task.title}`);

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Submit task error:', error);
    res.status(500).json({ success: false, error: '提交审核失败' });
  }
});

// 撤回审核
router.post('/:id/withdraw', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const task = await prisma.task.findUnique({ where: { id } });
    
    if (!task) return res.status(404).json({ success: false, error: '任务不存在' });
    if (task.status !== 'pending') return res.status(400).json({ success: false, error: '只有待审核状态可以撤回' });
    if (task.submittedById !== req.user!.id && req.user!.role !== 'ceo') {
      return res.status(403).json({ success: false, error: '无权限撤回此任务' });
    }

    const updated = await prisma.task.update({
      where: { id },
      data: { status: 'draft', submittedAt: null, submittedById: null },
    });

    // 记录审计日志
    const { auditStatusChange } = await import('../utils/audit');
    await auditStatusChange(req, 'task', id, task.title, 'pending', 'draft', `撤回任务审核: ${task.title}`);

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Withdraw task error:', error);
    res.status(500).json({ success: false, error: '撤回失败' });
  }
});

// 审核任务
router.post('/:id/review', roleMiddleware('manager', 'executive', 'ceo'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { approved, comment } = req.body;

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return res.status(404).json({ success: false, error: '任务不存在' });
    if (task.status !== 'pending') return res.status(400).json({ success: false, error: '只有待审核状态可以审核' });

    const updated = await prisma.task.update({
      where: { id },
      data: {
        status: approved ? 'active' : 'draft',
        reviewedAt: new Date(),
        reviewedById: req.user!.id,
        reviewComment: comment,
      },
      include: {
        assignee: { select: { id: true, name: true } },
        plan: { select: { id: true, title: true } },
      },
    });

    // 记录审计日志
    const { auditStatusChange } = await import('../utils/audit');
    const action = approved ? '审核通过' : '审核驳回';
    await auditStatusChange(req, 'task', id, task.title, 'pending', approved ? 'active' : 'draft', `${action}任务: ${task.title}`);

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Review task error:', error);
    res.status(500).json({ success: false, error: '审核失败' });
  }
});

// 更新任务（仅草稿和进行中可编辑）
router.put('/:id', permissionMiddleware('task:edit'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, assigneeId, priority, dueDate, progress, status } = req.body;
    
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return res.status(404).json({ success: false, error: '任务不存在' });

    // 权限检查
    const isCreator = task.createdById === req.user!.id;
    const isAssignee = task.assigneeId === req.user!.id;
    const isManager = ['ceo', 'executive', 'manager'].includes(req.user!.role!);

    if (!isCreator && !isAssignee && !isManager) {
      return res.status(403).json({ success: false, error: '无权限编辑此任务' });
    }

    // 状态检查
    if (task.status === 'draft') {
      // 草稿状态：创建者可以编辑所有字段
      if (!isCreator && !isManager) {
        return res.status(403).json({ success: false, error: '只有创建者可以编辑草稿' });
      }
    } else if (task.status === 'active' || task.status === 'in_progress') {
      // 进行中状态：执行者只能更新进度和状态
      const allowedFields = ['progress', 'status'];
      const requestedFields = Object.keys(req.body);
      const hasDisallowedFields = requestedFields.some(f => !allowedFields.includes(f));
      
      if (hasDisallowedFields && !isManager) {
        return res.status(403).json({ success: false, error: '执行者只能更新进度和状态' });
      }
    } else {
      // 其他状态不能编辑
      return res.status(400).json({ success: false, error: '当前状态不允许编辑' });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId;
    if (priority !== undefined) updateData.priority = priority;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (progress !== undefined) updateData.progress = progress;
    if (status !== undefined) updateData.status = status;

    const updated = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        assignee: { select: { id: true, name: true } },
        plan: { select: { id: true, title: true } },
      },
    });

    // 记录审计日志
    const { auditUpdate } = await import('../utils/audit');
    await auditUpdate(req, 'task', id, updated.title, task, updated);

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ success: false, error: '更新任务失败' });
  }
});

// 删除任务（仅草稿可删除，需要有删除权限）
router.delete('/:id', permissionMiddleware('task:delete'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const task = await prisma.task.findUnique({ where: { id } });
    
    if (!task) return res.status(404).json({ success: false, error: '任务不存在' });
    if (task.status !== 'draft') return res.status(400).json({ success: false, error: '只有草稿状态可以删除' });

    await prisma.task.delete({ where: { id } });

    // 记录审计日志
    const { auditDelete } = await import('../utils/audit');
    await auditDelete(req, 'task', id, task.title, task);

    res.json({ success: true, message: '任务已删除' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ success: false, error: '删除任务失败' });
  }
});

export default router;
