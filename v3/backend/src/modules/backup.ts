import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';
import { authMiddleware, roleMiddleware } from '../middleware/auth';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const router = Router();
router.use(authMiddleware);

// 备份目录配置
const BACKUP_DIR = path.join(process.cwd(), 'backups');
const DB_PATH = path.join(process.cwd(), 'dev.db');

// 确保备份目录存在
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// 生成备份文件名
function generateBackupName(version: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${version}_${timestamp}`;
}

// 获取所有数据（备份）
router.get('/export', roleMiddleware('ceo', 'executive'), async (req: Request, res: Response) => {
  try {
    const [users, departments, strategies, plans, tasks, assessments, roles, permissions, brand] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true, username: true, name: true, role: true, roleId: true,
          departmentId: true, position: true, email: true, phone: true, isActive: true,
        },
      }),
      prisma.department.findMany(),
      prisma.strategy.findMany(),
      prisma.plan.findMany(),
      prisma.task.findMany({
        select: {
          id: true, taskNumber: true, title: true, description: true, status: true,
          progress: true, priority: true, sourceType: true, assigneeId: true,
          assignerId: true, planId: true, dueDate: true, createdAt: true,
        },
      }),
      prisma.assessment.findMany(),
      prisma.role.findMany({
        include: { permissions: { include: { permission: true } } },
      }),
      prisma.permission.findMany(),
      prisma.brandConfig.findFirst(),
    ]);

    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      data: {
        users,
        departments,
        strategies,
        plans,
        tasks,
        assessments,
        roles,
        permissions,
        brand,
      },
    };

    res.json({
      success: true,
      data: backup,
    });
  } catch (error) {
    console.error('Backup error:', error);
    res.status(500).json({ success: false, error: '数据备份失败' });
  }
});

// 导入数据（还原）
router.post('/import', roleMiddleware('ceo'), async (req: Request, res: Response) => {
  try {
    const { data, options } = req.body;
    
    if (!data) {
      return res.status(400).json({ success: false, error: '无效的备份数据' });
    }

    const results: any = {};
    const skipExisting = options?.skipExisting || false;

    // 导入部门
    if (data.departments && options?.departments !== false) {
      let count = 0;
      for (const dept of data.departments) {
        try {
          if (skipExisting) {
            const existing = await prisma.department.findUnique({ where: { id: dept.id } });
            if (existing) continue;
          }
          await prisma.department.upsert({
            where: { id: dept.id },
            update: { name: dept.name, parentId: dept.parentId },
            create: dept,
          });
          count++;
        } catch (e) { /* skip */ }
      }
      results.departments = count;
    }

    // 导入角色
    if (data.roles && options?.roles !== false) {
      let count = 0;
      for (const role of data.roles) {
        try {
          await prisma.role.upsert({
            where: { id: role.id },
            update: { name: role.name, label: role.label, description: role.description, level: role.level },
            create: {
              id: role.id,
              name: role.name,
              label: role.label,
              description: role.description,
              level: role.level,
              isSystem: role.isSystem || false,
            },
          });
          count++;
        } catch (e) { /* skip */ }
      }
      results.roles = count;
    }

    // 导入用户
    if (data.users && options?.users !== false) {
      let count = 0;
      for (const user of data.users) {
        try {
          if (skipExisting) {
            const existing = await prisma.user.findUnique({ where: { id: user.id } });
            if (existing) continue;
          }
          // 使用默认密码
          const bcrypt = require('bcryptjs');
          const hashedPassword = await bcrypt.hash('123456', 10);
          await prisma.user.upsert({
            where: { id: user.id },
            update: { name: user.name, role: user.role, departmentId: user.departmentId, position: user.position },
            create: {
              id: user.id,
              username: user.username,
              password: hashedPassword,
              name: user.name,
              role: user.role,
              departmentId: user.departmentId,
              position: user.position,
              email: user.email,
              phone: user.phone,
              isActive: user.isActive,
            },
          });
          count++;
        } catch (e) { /* skip */ }
      }
      results.users = count;
    }

    // 导入战略
    if (data.strategies && options?.strategies !== false) {
      let count = 0;
      for (const strategy of data.strategies) {
        try {
          await prisma.strategy.upsert({
            where: { id: strategy.id },
            update: { title: strategy.title, description: strategy.description, status: strategy.status },
            create: strategy,
          });
          count++;
        } catch (e) { /* skip */ }
      }
      results.strategies = count;
    }

    // 导入计划
    if (data.plans && options?.plans !== false) {
      let count = 0;
      for (const plan of data.plans) {
        try {
          await prisma.plan.upsert({
            where: { id: plan.id },
            update: { title: plan.title, progress: plan.progress, status: plan.status },
            create: plan,
          });
          count++;
        } catch (e) { /* skip */ }
      }
      results.plans = count;
    }

    // 导入任务
    if (data.tasks && options?.tasks !== false) {
      let count = 0;
      for (const task of data.tasks) {
        try {
          await prisma.task.upsert({
            where: { id: task.id },
            update: { title: task.title, progress: task.progress, status: task.status },
            create: task,
          });
          count++;
        } catch (e) { /* skip */ }
      }
      results.tasks = count;
    }

    // 导入品牌配置
    if (data.brand && options?.brand !== false) {
      try {
        await prisma.brandConfig.upsert({
          where: { id: data.brand.id },
          update: data.brand,
          create: data.brand,
        });
        results.brand = 1;
      } catch (e) { /* skip */ }
    }

    res.json({
      success: true,
      message: '数据还原完成',
      results,
    });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ success: false, error: '数据还原失败' });
  }
});

// 创建真实数据库备份（文件级）
router.post('/db-backup', roleMiddleware('ceo'), async (req: Request, res: Response) => {
  try {
    const { version = 'manual' } = req.body;
    const backupName = generateBackupName(version);
    const dbBackupPath = path.join(BACKUP_DIR, `db_${backupName}.db`);

    // 复制数据库文件
    fs.copyFileSync(DB_PATH, dbBackupPath);

    // 获取文件大小
    const stats = fs.statSync(dbBackupPath);

    res.json({
      success: true,
      data: {
        backupName,
        dbPath: dbBackupPath,
        size: stats.size,
        createdAt: new Date().toISOString(),
      },
      message: '数据库备份成功',
    });
  } catch (error) {
    console.error('DB backup error:', error);
    res.status(500).json({ success: false, error: '数据库备份失败' });
  }
});

// 创建完整备份（数据库 + 代码）
router.post('/full-backup', roleMiddleware('ceo'), async (req: Request, res: Response) => {
  try {
    const { version = 'manual' } = req.body;
    const backupName = generateBackupName(version);
    const dbBackupPath = path.join(BACKUP_DIR, `db_${backupName}.db`);
    const codeBackupPath = path.join(BACKUP_DIR, `code_${backupName}.zip`);

    // 1. 备份数据库
    fs.copyFileSync(DB_PATH, dbBackupPath);

    // 2. 备份代码（使用 PowerShell Compress-Archive）
    const srcDir = path.join(process.cwd(), 'src');
    const prismaDir = path.join(process.cwd(), 'prisma');
    const tempDir = path.join(BACKUP_DIR, `temp_${backupName}`);
    
    fs.mkdirSync(tempDir, { recursive: true });
    
    // 复制关键文件到临时目录
    if (fs.existsSync(srcDir)) {
      copyDir(srcDir, path.join(tempDir, 'src'));
    }
    if (fs.existsSync(prismaDir)) {
      copyDir(prismaDir, path.join(tempDir, 'prisma'));
    }
    
    // 复制配置文件
    const configFiles = ['package.json', 'tsconfig.json', '.env.example'];
    for (const file of configFiles) {
      const src = path.join(process.cwd(), file);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(tempDir, file));
      }
    }

    // 压缩临时目录
    execSync(`powershell -Command "Compress-Archive -Path '${tempDir}\\*' -DestinationPath '${codeBackupPath}' -Force"`);
    
    // 清理临时目录
    fs.rmSync(tempDir, { recursive: true, force: true });

    // 获取文件大小
    const dbStats = fs.statSync(dbBackupPath);
    const codeStats = fs.statSync(codeBackupPath);

    res.json({
      success: true,
      data: {
        backupName,
        dbBackup: { path: dbBackupPath, size: dbStats.size },
        codeBackup: { path: codeBackupPath, size: codeStats.size },
        createdAt: new Date().toISOString(),
      },
      message: '完整备份成功（数据库 + 代码）',
    });
  } catch (error) {
    console.error('Full backup error:', error);
    res.status(500).json({ success: false, error: '完整备份失败' });
  }
});

// 列出所有备份
router.get('/list', roleMiddleware('ceo', 'executive'), async (req: Request, res: Response) => {
  try {
    const files = fs.readdirSync(BACKUP_DIR);
    const backups = files
      .filter(f => f.startsWith('db_') || f.startsWith('code_'))
      .map(f => {
        const stats = fs.statSync(path.join(BACKUP_DIR, f));
        return {
          name: f,
          type: f.startsWith('db_') ? 'database' : 'code',
          size: stats.size,
          createdAt: stats.birthtime,
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({
      success: true,
      data: backups,
    });
  } catch (error) {
    console.error('List backups error:', error);
    res.status(500).json({ success: false, error: '获取备份列表失败' });
  }
});

// 恢复数据库（从备份文件）
router.post('/restore', roleMiddleware('ceo'), async (req: Request, res: Response) => {
  try {
    const { backupName } = req.body;

    if (!backupName) {
      return res.status(400).json({ success: false, error: '请指定备份文件名' });
    }

    const dbBackupPath = path.join(BACKUP_DIR, `db_${backupName}.db`);

    if (!fs.existsSync(dbBackupPath)) {
      return res.status(404).json({ success: false, error: '备份文件不存在' });
    }

    // 先创建当前数据库的紧急备份
    const emergencyBackup = path.join(BACKUP_DIR, `emergency_${generateBackupName('pre-restore')}.db`);
    fs.copyFileSync(DB_PATH, emergencyBackup);

    // 关闭 Prisma 连接
    await prisma.$disconnect();

    // 替换数据库文件
    fs.copyFileSync(dbBackupPath, DB_PATH);

    // 重新连接 Prisma
    await prisma.$connect();

    res.json({
      success: true,
      data: {
        restoredFrom: backupName,
        emergencyBackup,
        restoredAt: new Date().toISOString(),
      },
      message: '数据库恢复成功',
    });
  } catch (error) {
    console.error('Restore error:', error);
    res.status(500).json({ success: false, error: '数据库恢复失败' });
  }
});

// 删除备份
router.delete('/:backupName', roleMiddleware('ceo'), async (req: Request, res: Response) => {
  try {
    const { backupName } = req.params;
    const filePath = path.join(BACKUP_DIR, backupName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: '备份文件不存在' });
    }

    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: '备份已删除',
    });
  } catch (error) {
    console.error('Delete backup error:', error);
    res.status(500).json({ success: false, error: '删除备份失败' });
  }
});

// 重置数据库（危险操作）
router.post('/reset', roleMiddleware('ceo'), async (req: Request, res: Response) => {
  try {
    // 先创建紧急备份
    const emergencyBackup = path.join(BACKUP_DIR, `emergency_${generateBackupName('pre-reset')}.db`);
    fs.copyFileSync(DB_PATH, emergencyBackup);

    // 仅保留 CEO 用户
    const ceo = await prisma.user.findFirst({ where: { role: 'ceo' } });
    
    // 删除大部分数据
    await prisma.task.deleteMany({});
    await prisma.plan.deleteMany({});
    await prisma.strategy.deleteMany({});
    await prisma.department.deleteMany({});
    
    res.json({
      success: true,
      message: '数据库已重置',
      data: { emergencyBackup },
    });
  } catch (error) {
    console.error('Reset error:', error);
    res.status(500).json({ success: false, error: '重置失败' });
  }
});

// 辅助函数：递归复制目录
function copyDir(src: string, dest: string) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

export default router;
