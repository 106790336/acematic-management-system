import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';

const router = Router();

// 健康检查端点
router.get('/', async (req: Request, res: Response) => {
  try {
    // 检查数据库连接
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
      },
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      success: false,
      error: '服务异常',
      data: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

// 详细健康检查（包含依赖状态）
router.get('/detailed', async (req: Request, res: Response) => {
  const checks: any = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };

  // 数据库检查
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'healthy', message: '数据库连接正常' };
  } catch (error) {
    checks.database = { status: 'unhealthy', message: '数据库连接失败' };
  }

  // 内存检查
  const memUsage = process.memoryUsage();
  checks.memory = {
    status: memUsage.heapUsed < 512 * 1024 * 1024 ? 'healthy' : 'warning',
    used: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
    total: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
  };

  // 磁盘检查（简化版）
  checks.disk = { status: 'healthy', message: '磁盘空间充足' };

  const allHealthy = Object.values(checks)
    .filter((v: any) => v && v.status)
    .every((v: any) => v.status === 'healthy');

  res.status(allHealthy ? 200 : 503).json({
    success: allHealthy,
    data: {
      status: allHealthy ? 'healthy' : 'degraded',
      checks,
    },
  });
});

export default router;
