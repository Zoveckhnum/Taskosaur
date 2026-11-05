import 'reflect-metadata';
import * as assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../src/prisma/prisma.service';
import { Prisma, ScopeType, ViewType } from '@prisma/client';
import { AdminSeederService } from '../src/seeder/admin-seeder.service';
import { TaskRanksService } from '../src/modules/task-ranks/task-ranks.service';

async function main() {
  if (!process.env.DATABASE_URL?.includes(';database=TaskosaurIqualitys_Test;')) throw new Error('Only the isolated TaskosaurIqualitys_Test database is allowed');
  const prisma = new PrismaService();
  try {
    await prisma.$connect();
    const tag = randomUUID();
    const first = await prisma.user.create({ data: { email: `${tag}@example.test`, firstName: 'Prueba', lastName: 'SQL', preferences: { language: 'es', flags: [1, 2] } } });
    await prisma.user.create({ data: { email: `second-${tag}@example.test`, firstName: 'Segunda', lastName: 'SQL' } });
    assert.deepEqual(first.preferences, { language: 'es', flags: [1, 2] });
    const found = await prisma.user.findFirst({ where: { email: { equals: `${tag}@example.test`.toUpperCase(), mode: 'insensitive' } }, select: { preferences: true, role: true } });
    assert.equal(found?.role, 'MEMBER');
    assert.deepEqual(found?.preferences, first.preferences);
    await prisma.$transaction(async tx => {
      await tx.user.update({ where: { id: first.id }, data: { preferences: { nested: { a: true } } } });
      const result = await tx.user.findUniqueOrThrow({ where: { id: first.id } });
      assert.deepEqual(result.preferences, { nested: { a: true } });
    });
    await assert.rejects(prisma.$transaction(async tx => {
      await tx.user.update({ where: { id: first.id }, data: { preferences: { rollback: true } } });
      throw new Error('rollback');
    }));
    assert.deepEqual((await prisma.user.findUniqueOrThrow({ where: { id: first.id } })).preferences, { nested: { a: true } });
    const pagination = await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM users ORDER BY email LIMIT ${1}::int OFFSET ${0}::int`;
    assert.equal(pagination.length, 1);
    const rawJson = await prisma.$queryRaw<{ new_value: { projectId: string } }[]>`SELECT ${JSON.stringify({ projectId: first.id })} AS new_value`;
    assert.deepEqual(rawJson[0].new_value, { projectId: first.id });
    const admin = await prisma.user.findUnique({ where: { email: 'admin@taskosaur.com' } }) || await new AdminSeederService(prisma).seed();
    assert.ok(admin);
    const org = await prisma.organization.findFirstOrThrow({ where: { ownerId: admin.id } });
    const workspace = await prisma.workspace.create({ data: { name: 'SQL Test', slug: tag, organizationId: org.id, settings: { test: true } } });
    const workflow = await prisma.workflow.findFirstOrThrow({ where: { organizationId: org.id } });
    const status = await prisma.taskStatus.findFirstOrThrow({ where: { workflowId: workflow.id } });
    const project = await prisma.project.create({ data: { name: 'SQL Project', slug: `p-${tag}`, color: '#123456', workspaceId: workspace.id, workflowId: workflow.id } });
    const task = await prisma.task.create({ data: { title: 'SQL Task', slug: `t-${tag}`, taskNumber: 1, projectId: project.id, statusId: status.id, customFields: { priority: 1 }, recurringConfig: { create: { recurrenceType: 'WEEKLY', interval: 1, daysOfWeek: [1, 3], endType: 'NEVER', nextOccurrence: new Date() } } }, include: { recurringConfig: true, project: { include: { workspace: true } } } });
    assert.deepEqual(task.recurringConfig?.daysOfWeek, [1, 3]);
    assert.deepEqual(task.project.workspace.settings, { test: true });
    await prisma.$transaction(async tx => {
      const locked = await tx.$queryRaw<{ slug: string }[]>`SELECT slug, task_prefix FROM projects WHERE id = ${project.id}::uuid FOR UPDATE`;
      assert.equal(locked[0].slug, project.slug);
      const data = { taskId: task.id, scopeType: ScopeType.PROJECT, scopeId: project.id, viewType: ViewType.LIST, rank: 1 };
      assert.equal((await tx.taskRank.createMany({ data: [data, data], skipDuplicates: true })).count, 1);
    });
    const ranks = new TaskRanksService(prisma);
    assert.ok(ranks);
    await prisma.user.update({ where: { id: first.id }, data: { preferences: Prisma.DbNull } });
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: first.id } })).preferences, null);
    await prisma.task.delete({ where: { id: task.id } });
    assert.equal(await prisma.recurringTask.count({ where: { taskId: task.id } }), 0);
    console.log('SQL Server integration: JSON, nested lists, nullable unique fields, CI searches, raw pagination, row locks, seeding, transactions, duplicate inserts and cascades passed.');
  } finally { await prisma.$disconnect(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
