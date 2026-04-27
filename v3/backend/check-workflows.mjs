import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const workflows = await prisma.workflow.findMany({ include: { steps: true } });
console.log('✅ 工作流数量:', workflows.length);
for (const w of workflows) {
  console.log('-', w.name, '|', w.entityType, '| 启用:', w.isActive, '| 步骤:', w.steps.length);
}
await prisma.$disconnect();
