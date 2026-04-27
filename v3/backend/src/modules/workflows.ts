import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';
import { authMiddleware, roleMiddleware, permissionMiddleware } from '../middleware/auth';
import { z } from 'zod';

const router = Router();
router.use(authMiddleware);

// ========== 获取所有工作流 ==========
router.get('/', async (_req: Request, res: Response) => {
  try {
    const workflows = await prisma.workflow.findMany({
      include: {
        steps: {
          include: {
            role: { select: { id: true, name: true, label: true } },
            reviewer: { select: { id: true, name: true, role: true, department: { select: { name: true } } } },
          },
          orderBy: { level: 'asc' },
        },
      },
      orderBy: { entityType: 'asc' },
    });
    res.json({ success: true, data: workflows });
  } catch (error) {
    console.error('Get workflows error:', error);
    res.status(500).json({ success: false, error: '获取工作流列表失败' });
  }
});

// ========== 获取单个工作流 ==========
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const workflow = await prisma.workflow.findUnique({
      where: { id },
      include: {
        steps: {
          include: {
            role: { select: { id: true, name: true, label: true } },
            reviewer: { select: { id: true, name: true, role: true } },
          },
          orderBy: { level: 'asc' },
        },
      },
    });
    if (!workflow) return res.status(404).json({ success: false, error: '工作流不存在' });
    res.json({ success: true, data: workflow });
  } catch (error) {
    console.error('Get workflow error:', error);
    res.status(500).json({ success: false, error: '获取工作流详情失败' });
  }
});

// ========== 根据实体类型获取工作流（供其他模块调用）==========
router.get('/by-type/:entityType', async (req: Request, res: Response) => {
  try {
    const { entityType } = req.params;
    const workflow = await prisma.workflow.findUnique({
      where: { entityType },
      include: {
        steps: {
          include: {
            role: { select: { id: true, name: true, label: true } },
            reviewer: { select: { id: true, name: true, role: true } },
          },
          orderBy: { level: 'asc' },
        },
      },
    });
    res.json({ success: true, data: workflow });
  } catch (error) {
    console.error('Get workflow by type error:', error);
    res.status(500).json({ success: false, error: '获取工作流失败' });
  }
});

// ========== 创建工作流 ==========
const CreateWorkflowSchema = z.object({
  name: z.string().min(1, '流程名称不能为空'),
  description: z.string().optional(),
  entityType: z.enum(['strategy', 'plan', 'task']),
  isActive: z.boolean().optional(),
  steps: z.array(z.object({
    level: z.number().min(1),
    reviewerType: z.enum(['role', 'user']),
    roleId: z.string().optional(),
    reviewerId: z.string().optional(),
    requireAll: z.boolean().optional(),
  })).min(1, '至少需要一个审批步骤'),
});

router.post('/', permissionMiddleware('settings:edit'), async (req: Request, res: Response) => {
  try {
    const data = CreateWorkflowSchema.parse(req.body);

    // 检查该实体类型是否已有工作流
    const existing = await prisma.workflow.findUnique({ where: { entityType: data.entityType } });
    if (existing) {
      return res.status(400).json({ success: false, error: `${data.entityType} 类型的流程已存在，请编辑现有流程` });
    }

    // 验证每个步骤
    for (const step of data.steps) {
      if (step.reviewerType === 'role' && !step.roleId) {
        return res.status(400).json({ success: false, error: '按角色审批时必须选择角色' });
      }
      if (step.reviewerType === 'user' && !step.reviewerId) {
        return res.status(400).json({ success: false, error: '指定用户审批时必须选择用户' });
      }
    }

    const workflow = await prisma.workflow.create({
      data: {
        name: data.name,
        description: data.description,
        entityType: data.entityType,
        isActive: data.isActive ?? true,
        steps: {
          create: data.steps.map(step => ({
            level: step.level,
            reviewerType: step.reviewerType,
            roleId: step.roleId || null,
            reviewerId: step.reviewerId || null,
            requireAll: step.requireAll ?? false,
          })),
        },
      },
      include: {
        steps: {
          include: {
            role: { select: { id: true, name: true, label: true } },
            reviewer: { select: { id: true, name: true, role: true } },
          },
          orderBy: { level: 'asc' },
        },
      },
    });

    res.json({ success: true, data: workflow });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: error.errors[0].message });
    }
    console.error('Create workflow error:', error);
    res.status(500).json({ success: false, error: '创建工作流失败' });
  }
});

// ========== 更新工作流 ==========
router.put('/:id', permissionMiddleware('settings:edit'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, isActive, steps } = req.body;

    const workflow = await prisma.workflow.findUnique({ where: { id } });
    if (!workflow) return res.status(404).json({ success: false, error: '工作流不存在' });

    // 如果提供了新的步骤，先验证
    if (steps && Array.isArray(steps)) {
      for (const step of steps) {
        if (step.reviewerType === 'role' && !step.roleId) {
          return res.status(400).json({ success: false, error: '按角色审批时必须选择角色' });
        }
        if (step.reviewerType === 'user' && !step.reviewerId) {
          return res.status(400).json({ success: false, error: '指定用户审批时必须选择用户' });
        }
      }
    }

    // 更新基本信息
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;

    // 更新步骤（全量替换）
    if (steps && Array.isArray(steps)) {
      // 删除旧步骤
      await prisma.workflowStep.deleteMany({ where: { workflowId: id } });
      // 创建新步骤
      updateData.steps = {
        create: steps.map((step: any) => ({
          level: step.level,
          reviewerType: step.reviewerType,
          roleId: step.roleId || null,
          reviewerId: step.reviewerId || null,
          requireAll: step.requireAll ?? false,
        })),
      };
    }

    const updated = await prisma.workflow.update({
      where: { id },
      data: updateData,
      include: {
        steps: {
          include: {
            role: { select: { id: true, name: true, label: true } },
            reviewer: { select: { id: true, name: true, role: true } },
          },
          orderBy: { level: 'asc' },
        },
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update workflow error:', error);
    res.status(500).json({ success: false, error: '更新工作流失败' });
  }
});

// ========== 切换工作流启用状态 ==========
router.patch('/:id/toggle', permissionMiddleware('settings:edit'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const workflow = await prisma.workflow.findUnique({ where: { id } });
    if (!workflow) return res.status(404).json({ success: false, error: '工作流不存在' });

    const updated = await prisma.workflow.update({
      where: { id },
      data: { isActive: !workflow.isActive },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Toggle workflow error:', error);
    res.status(500).json({ success: false, error: '切换工作流状态失败' });
  }
});

// ========== 删除工作流 ==========
router.delete('/:id', permissionMiddleware('settings:edit'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const workflow = await prisma.workflow.findUnique({ where: { id } });
    if (!workflow) return res.status(404).json({ success: false, error: '工作流不存在' });

    // 检查是否有正在进行的审批使用该流程
    // （可选：这里暂不做强校验，允许删除）

    await prisma.workflow.delete({ where: { id } });
    res.json({ success: true, message: '工作流已删除' });
  } catch (error) {
    console.error('Delete workflow error:', error);
    res.status(500).json({ success: false, error: '删除工作流失败' });
  }
});

// ========== 获取可用角色列表（供前端选择）==========
router.get('/options/roles', async (_req: Request, res: Response) => {
  try {
    const roles = await prisma.role.findMany({
      // Role 表没有 isActive 字段，查询所有角色
      select: { id: true, name: true, label: true, level: true },
      orderBy: { level: 'asc' },
    });
    res.json({ success: true, data: roles });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ success: false, error: '获取角色列表失败' });
  }
});

// ========== 获取可用用户列表（供前端选择）==========
router.get('/options/users', async (req: Request, res: Response) => {
  try {
    const { departmentId } = req.query;
    const where: any = { isActive: true };
    if (departmentId) where.departmentId = departmentId;

    const users = await prisma.user.findMany({
      where,
      select: { id: true, name: true, role: true, department: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, error: '获取用户列表失败' });
  }
});

export default router;
