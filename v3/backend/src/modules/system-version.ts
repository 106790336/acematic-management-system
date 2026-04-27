import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';
import { authMiddleware, roleMiddleware } from '../middleware/auth';
import { createAuditLog, AuditAction } from '../utils/audit';

const router = Router();

// 获取版本列表（需要管理员权限）
router.get('/', authMiddleware, roleMiddleware('ceo', 'executive'), async (req: Request, res: Response) => {
  try {
    const versions = await prisma.systemVersion.findMany({
      orderBy: { deployedAt: 'desc' },
      include: {
        deployedBy: {
          select: { id: true, name: true, username: true }
        },
        rolledBackBy: {
          select: { id: true, name: true, username: true }
        }
      }
    });

    res.json({
      success: true,
      data: versions
    });
  } catch (error) {
    console.error('获取版本列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取版本列表失败'
    });
  }
});

// 获取当前版本
router.get('/current', authMiddleware, async (req: Request, res: Response) => {
  try {
    const currentVersion = await prisma.systemVersion.findFirst({
      where: { status: 'active' },
      orderBy: { deployedAt: 'desc' },
      include: {
        deployedBy: {
          select: { id: true, name: true, username: true }
        }
      }
    });

    res.json({
      success: true,
      data: currentVersion
    });
  } catch (error) {
    console.error('获取当前版本失败:', error);
    res.status(500).json({
      success: false,
      error: '获取当前版本失败'
    });
  }
});

// 创建新版本（部署）
router.post('/', authMiddleware, roleMiddleware('ceo', 'executive'), async (req: Request, res: Response) => {
  try {
    const { version, name, changes } = req.body;
    const userId = (req as any).user?.id;

    if (!version || !name) {
      return res.status(400).json({
        success: false,
        error: '版本号和名称不能为空'
      });
    }

    // 检查版本号是否已存在
    const existing = await prisma.systemVersion.findUnique({
      where: { version }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: '版本号已存在'
      });
    }

    // 将之前的活跃版本标记为已废弃
    await prisma.systemVersion.updateMany({
      where: { status: 'active' },
      data: { status: 'deprecated' }
    });

    // 创建新版本记录
    const newVersion = await prisma.systemVersion.create({
      data: {
        version,
        name,
        status: 'active',
        deployedById: userId,
        changes: changes ? JSON.stringify(changes) : null,
        dbSnapshot: `backups/db_${version}.db`,
        codeSnapshot: `backups/code_${version}.zip`
      },
      include: {
        deployedBy: {
          select: { id: true, name: true, username: true }
        }
      }
    });

    // 记录审计日志
    await createAuditLog(req, {
      action: AuditAction.CREATE,
      entityType: 'system',
      entityId: newVersion.id,
      entityName: version,
      description: `部署系统版本: ${version} - ${name}`,
      newData: { version, name, changes },
    });

    res.json({
      success: true,
      data: newVersion,
      message: '版本部署成功'
    });
  } catch (error) {
    console.error('部署版本失败:', error);
    res.status(500).json({
      success: false,
      error: '部署版本失败'
    });
  }
});

// 回滚到指定版本
router.post('/:id/rollback', authMiddleware, roleMiddleware('ceo', 'executive'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = (req as any).user?.id;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: '回滚原因不能为空'
      });
    }

    // 查找目标版本
    const targetVersion = await prisma.systemVersion.findUnique({
      where: { id }
    });

    if (!targetVersion) {
      return res.status(404).json({
        success: false,
        error: '版本不存在'
      });
    }

    if (targetVersion.status === 'active') {
      return res.status(400).json({
        success: false,
        error: '该版本当前正在使用，无需回滚'
      });
    }

    // 将当前活跃版本标记为已回滚
    await prisma.systemVersion.updateMany({
      where: { status: 'active' },
      data: { 
        status: 'rolled_back',
        rolledBackAt: new Date(),
        rolledBackById: userId,
        rollbackReason: reason
      }
    });

    // 将目标版本标记为活跃
    const updatedVersion = await prisma.systemVersion.update({
      where: { id },
      data: { status: 'active' },
      include: {
        deployedBy: {
          select: { id: true, name: true, username: true }
        },
        rolledBackBy: {
          select: { id: true, name: true, username: true }
        }
      }
    });

    // 记录审计日志
    await createAuditLog(req, {
      action: 'restore',
      entityType: 'system',
      entityId: updatedVersion.id,
      entityName: updatedVersion.version,
      description: `系统回滚到版本: ${updatedVersion.version}，原因: ${reason}`,
      oldData: { status: 'active' },
      newData: { status: 'rolled_back' },
    });

    res.json({
      success: true,
      data: updatedVersion,
      message: `已成功回滚到版本 ${updatedVersion.version}`
    });
  } catch (error) {
    console.error('回滚版本失败:', error);
    res.status(500).json({
      success: false,
      error: '回滚版本失败'
    });
  }
});

// 获取版本详情
router.get('/:id', authMiddleware, roleMiddleware('ceo', 'executive'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const version = await prisma.systemVersion.findUnique({
      where: { id },
      include: {
        deployedBy: {
          select: { id: true, name: true, username: true }
        },
        rolledBackBy: {
          select: { id: true, name: true, username: true }
        }
      }
    });

    if (!version) {
      return res.status(404).json({
        success: false,
        error: '版本不存在'
      });
    }

    res.json({
      success: true,
      data: version
    });
  } catch (error) {
    console.error('获取版本详情失败:', error);
    res.status(500).json({
      success: false,
      error: '获取版本详情失败'
    });
  }
});

export default router;
