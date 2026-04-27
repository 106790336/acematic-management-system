import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';
import { authMiddleware, roleMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// ========== 审计日志查询接口 ==========

// 获取审计日志列表（支持筛选和分页）
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      action,
      entityType,
      entityId,
      userId,
      status,
      startDate,
      endDate,
      search,
    } = req.query;

    const where: any = {};

    // 按操作类型筛选
    if (action) {
      where.action = action as string;
    }

    // 按实体类型筛选
    if (entityType) {
      where.entityType = entityType as string;
    }

    // 按实体ID筛选
    if (entityId) {
      where.entityId = entityId as string;
    }

    // 按用户筛选
    if (userId) {
      where.userId = userId as string;
    }

    // 按状态筛选
    if (status) {
      where.status = status as string;
    }

    // 按日期范围筛选
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate as string);
      }
    }

    // 搜索（描述或实体名称）
    if (search) {
      where.OR = [
        { description: { contains: search as string, mode: 'insensitive' } },
        { entityName: { contains: search as string, mode: 'insensitive' } },
        { userName: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        items: logs,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      error: '获取审计日志失败',
    });
  }
});

// 获取单条审计日志详情
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const log = await prisma.auditLog.findUnique({
      where: { id },
    });

    if (!log) {
      return res.status(404).json({
        success: false,
        error: '审计日志不存在',
      });
    }

    res.json({
      success: true,
      data: log,
    });
  } catch (error) {
    console.error('Get audit log detail error:', error);
    res.status(500).json({
      success: false,
      error: '获取审计日志详情失败',
    });
  }
});

// 获取某实体的操作历史
router.get('/entity/:entityType/:entityId', async (req: Request, res: Response) => {
  try {
    const { entityType, entityId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: {
          entityType,
          entityId,
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({
        where: {
          entityType,
          entityId,
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        items: logs,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get entity audit history error:', error);
    res.status(500).json({
      success: false,
      error: '获取实体操作历史失败',
    });
  }
});

// 获取当前用户的操作记录
router.get('/my-logs', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: { userId: req.user!.id },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({
        where: { userId: req.user!.id },
      }),
    ]);

    res.json({
      success: true,
      data: {
        items: logs,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get my audit logs error:', error);
    res.status(500).json({
      success: false,
      error: '获取个人操作记录失败',
    });
  }
});

// 获取统计信息（仅管理员）
router.get('/stats/overview', roleMiddleware('ceo', 'admin'), async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.gte = new Date(startDate as string);
      if (endDate) dateFilter.createdAt.lte = new Date(endDate as string);
    }

    // 按操作类型统计
    const actionStats = await prisma.auditLog.groupBy({
      by: ['action'],
      where: dateFilter,
      _count: { action: true },
    });

    // 按实体类型统计
    const entityStats = await prisma.auditLog.groupBy({
      by: ['entityType'],
      where: dateFilter,
      _count: { entityType: true },
    });

    // 按状态统计
    const statusStats = await prisma.auditLog.groupBy({
      by: ['status'],
      where: dateFilter,
      _count: { status: true },
    });

    // 今日操作数
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = await prisma.auditLog.count({
      where: {
        createdAt: { gte: today },
      },
    });

    // 总操作数
    const totalCount = await prisma.auditLog.count({ where: dateFilter });

    // 最活跃的用户（前10）
    const topUsers = await prisma.auditLog.groupBy({
      by: ['userId', 'userName'],
      where: dateFilter,
      _count: { userId: true },
      orderBy: { _count: { userId: 'desc' } },
      take: 10,
    });

    res.json({
      success: true,
      data: {
        totalCount,
        todayCount,
        actionStats: actionStats.map(s => ({ action: s.action, count: s._count.action })),
        entityStats: entityStats.map(s => ({ entityType: s.entityType, count: s._count.entityType })),
        statusStats: statusStats.map(s => ({ status: s.status, count: s._count.status })),
        topUsers: topUsers.map(u => ({
          userId: u.userId,
          userName: u.userName,
          count: u._count.userId,
        })),
      },
    });
  } catch (error) {
    console.error('Get audit stats error:', error);
    res.status(500).json({
      success: false,
      error: '获取审计统计失败',
    });
  }
});

// 导出审计日志（仅管理员）
router.get('/export/all', roleMiddleware('ceo', 'admin'), async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error('Export audit logs error:', error);
    res.status(500).json({
      success: false,
      error: '导出审计日志失败',
    });
  }
});

export default router;
