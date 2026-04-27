import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, name: true, role: true, password: true },
    take: 5
  });
  
  console.log('用户列表:');
  for (const u of users) {
    console.log(`- ${u.username} | ${u.name} | ${u.role}`);
    // 测试密码
    const match = await bcrypt.compare('admin123', u.password);
    console.log(`  密码 'admin123' 匹配: ${match}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
