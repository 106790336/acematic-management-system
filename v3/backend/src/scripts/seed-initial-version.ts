import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedInitialVersion() {
  try {
    // 检查是否已有版本记录
    const existing = await prisma.systemVersion.findFirst({
      where: { status: 'active' }
    });

    if (existing) {
      console.log('已存在活跃版本，跳过初始化');
      return;
    }

    // 创建初始版本记录
    const version = await prisma.systemVersion.create({
      data: {
        version: 'v1.0.0',
        name: '初始版本 - 基础功能',
        status: 'active',
        changes: JSON.stringify([
          '系统初始化',
          '基础功能模块',
          '用户权限系统',
          '审计日志功能'
        ])
      }
    });

    console.log('✅ 初始版本创建成功:', version.version);
  } catch (error) {
    console.error('❌ 初始化版本失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedInitialVersion();
