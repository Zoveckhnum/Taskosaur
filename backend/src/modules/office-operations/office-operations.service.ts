import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, Role, UserStatus, TaskPriority } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { AccessControlService } from 'src/common/access-control.utils';
import { RequestContextService } from 'src/common/request-context.service';
import { TasksService } from '../tasks/tasks.service';
import { CentralAccess } from '../auth/services/central-access';
import {
  actor,
  object,
  parameters,
  canonical,
  digest,
  operationUuid,
  TaskOperationParameters,
} from './operation-contract';
import { CreateTaskDto } from '../tasks/dto/create-task.dto';
import { UpdateTaskDto } from '../tasks/dto/update-task.dto';

type Actor = ReturnType<typeof actor>;
type Access = { localAccountId: string; version: number };
type Prepared = {
  operation: string;
  operationId: string;
  projectId: string;
  parameters: TaskOperationParameters;
  canonical: Record<string, unknown>;
  revision: string;
  actorVersion: number;
  summary: string;
  changes: Array<{ field: string; before: unknown; after: unknown }>;
};
type Receipt = {
  operationId: string;
  platform: string;
  resourceId: string;
  slug: string;
  url: string;
  summary: string;
};
type ReceiptRow = { user_id: string; payload_hash: string; receipt_json: string };
@Injectable()
export class OfficeOperationsService {
  constructor(
    private prisma: PrismaService,
    private tasks: TasksService,
    private config: ConfigService,
  ) {}
  private async identity(a: Actor): Promise<Access> {
    const central = new CentralAccess(this.config);
    if (!central.enabled)
      throw new ServiceUnavailableException('Las operaciones requieren acceso central.');
    return central.check(a.issuer, a.subject);
  }
  private async user(db: Prisma.TransactionClient, id: string) {
    const user = await db.user.findUnique({
      where: { id },
      select: { id: true, status: true, deletedAt: true },
    });
    if (!user || user.status !== UserStatus.ACTIVE || user.deletedAt)
      throw new ForbiddenException('La cuenta local no está activa.');
  }
  private async scope(
    db: Prisma.TransactionClient,
    id: string,
    operation: string,
    p: TaskOperationParameters,
    write = false,
  ) {
    await this.user(db, id);
    const acl = new AccessControlService(db as PrismaService);
    const task = p.taskId
      ? await db.task.findUnique({
          where: { id: p.taskId },
          include: { status: true, assignees: { select: { userId: true } } },
        })
      : null;
    if (p.taskId && (!task || task.isArchived))
      throw new NotFoundException('La tarea no está disponible.');
    const project = await db.project.findUnique({
      where: { id: p.projectId ?? task!.projectId },
      include: { workspace: { include: { organization: true } } },
    });
    if (
      !project ||
      project.archive ||
      project.workspace.archive ||
      project.workspace.organization.archive
    )
      throw new ForbiddenException('El proyecto no está disponible.');
    const permission = task
      ? await acl.getTaskAccess(task.id, id)
      : await acl.getProjectAccess(project.id, id);
    if (write && !permission.canChange)
      throw new ForbiddenException('No puedes modificar este recurso.');
    if (
      write &&
      task &&
      permission.role === Role.MEMBER &&
      Object.keys(p).some((k) => !['taskId', 'statusId'].includes(k))
    )
      throw new ForbiddenException('Un miembro solo puede cambiar el estado de esta tarea.');
    return { project, task, acl };
  }
  private async prepareIn(
    db: Prisma.TransactionClient,
    a: Access,
    operationId: string,
    operation: string,
    p: TaskOperationParameters,
  ): Promise<Prepared> {
    const { project, task, acl } = await this.scope(db, a.localAccountId, operation, p, true);
    const statusId = p.statusId ?? task?.statusId;
    const status = statusId
      ? await db.taskStatus.findUnique({ where: { id: statusId } })
      : await db.taskStatus.findFirst({
          where: { workflowId: project.workflowId, deletedAt: null, category: 'TODO' },
          orderBy: [{ isDefault: 'desc' }, { position: 'asc' }, { id: 'asc' }],
        });
    if (!status || status.deletedAt || status.workflowId !== project.workflowId)
      throw new BadRequestException('El estado no pertenece al flujo del proyecto.');
    const assigneeIds = p.assigneeIds ?? task?.assignees.map((v) => v.userId) ?? [];
    for (const id of assigneeIds) {
      await this.user(db, id);
      if (!(await acl.getProjectAccess(project.id, id)).canChange)
        throw new ForbiddenException('Un responsable no tiene acceso de trabajo al proyecto.');
    }
    const dueDate = p.dueDate ? p.dueDate + 'T18:00:00.000Z' : task?.dueDate?.toISOString();
    if (task?.startDate && dueDate && new Date(dueDate) < task.startDate)
      throw new BadRequestException('La fecha de entrega es anterior al inicio.');
    const fields: Record<string, unknown> =
      operation === 'task.create'
        ? {
            title: p.title,
            description: p.description ?? '',
            priority: p.priority ?? TaskPriority.MEDIUM,
            statusId: status.id,
            projectId: project.id,
            assigneeIds,
            ...(dueDate ? { dueDate } : {}),
          }
        : {
            ...('title' in p ? { title: p.title } : {}),
            ...('description' in p ? { description: p.description } : {}),
            ...('priority' in p ? { priority: p.priority } : {}),
            ...('statusId' in p ? { statusId: status.id } : {}),
            ...('assigneeIds' in p ? { assigneeIds } : {}),
            ...('dueDate' in p ? { dueDate } : {}),
          };
    const names = await db.user.findMany({
      where: {
        id: { in: [...new Set([...assigneeIds, ...(task?.assignees.map((v) => v.userId) ?? [])])] },
      },
      select: { id: true, firstName: true, lastName: true },
    });
    const nameOf = (ids: string[]) =>
      ids
        .map((id) => names.find((n) => n.id === id))
        .map((n) =>
          n ? [n.firstName, n.lastName].filter(Boolean).join(' ') : 'Responsable no disponible',
        )
        .sort();
    const before = task
      ? {
          title: task.title,
          description: task.description ?? '',
          priority: task.priority,
          status: task.status.name,
          assignees: nameOf(task.assignees.map((v) => v.userId)),
          dueDate: task.dueDate?.toISOString() ?? null,
        }
      : null;
    const after = {
      title: p.title ?? task?.title,
      description: p.description ?? task?.description ?? '',
      priority: p.priority ?? task?.priority ?? TaskPriority.MEDIUM,
      status: status.name,
      assignees: nameOf(assigneeIds),
      dueDate: dueDate ?? null,
    };
    const changes = Object.entries(after)
      .filter(
        ([key, value]) =>
          canonical(before?.[key as keyof typeof before] ?? null) !== canonical(value),
      )
      .map(([field, value]) => ({
        field,
        before: before?.[field as keyof typeof before] ?? null,
        after: value,
      }));
    if (!changes.length) throw new ConflictException('La propuesta no cambia la tarea.');
    return {
      operation,
      operationId,
      projectId: project.id,
      parameters: p,
      canonical: fields,
      revision: digest({
        taskUpdatedAt: task?.updatedAt.toISOString() ?? null,
        projectUpdatedAt: project.updatedAt.toISOString(),
        statusUpdatedAt: status.updatedAt.toISOString(),
        before,
        after,
      }),
      actorVersion: a.version,
      summary: `${project.workspace.name} · ${project.name}${task ? ' · ' + task.slug : ''}`,
      changes,
    };
  }
  async prepare(body: unknown) {
    const b = object(body, ['actor', 'operationId', 'operation', 'parameters']),
      who = actor(b.actor);
    if (
      typeof b.operationId !== 'string' ||
      !operationUuid.test(b.operationId) ||
      typeof b.operation !== 'string'
    )
      throw new BadRequestException('Folio no válido.');
    const p = parameters(b.operation, b.parameters),
      access = await this.identity(who);
    return this.prisma.$transaction((tx) =>
      this.prepareIn(tx, access, b.operationId as string, b.operation as string, p),
    );
  }
  async authorize(body: unknown) {
    const b = object(body, ['actor', 'operation', 'parameters']),
      who = actor(b.actor),
      p = parameters(String(b.operation), b.parameters),
      access = await this.identity(who);
    await this.prisma.$transaction((tx) =>
      this.scope(tx, access.localAccountId, String(b.operation), p),
    );
    return { allowed: true };
  }
  private executeBody(value: unknown) {
    const b = object(value, ['actor', 'operationId', 'prepared']),
      who = actor(b.actor),
      p = object(b.prepared, [
        'operation',
        'operationId',
        'projectId',
        'parameters',
        'canonical',
        'revision',
        'actorVersion',
        'summary',
        'changes',
      ]);
    if (
      typeof b.operationId !== 'string' ||
      !operationUuid.test(b.operationId) ||
      p.operationId !== b.operationId ||
      typeof p.projectId !== 'string' ||
      !operationUuid.test(p.projectId) ||
      !Number.isSafeInteger(p.actorVersion)
    )
      throw new BadRequestException('Folio no válido.');
    parameters(String(p.operation), p.parameters);
    return { actor: who, operationId: b.operationId, prepared: p as unknown as Prepared };
  }
  async execute(value: unknown) {
    const b = this.executeBody(value),
      access = await this.identity(b.actor),
      payloadHash = digest(b);
    try {
      const r = await fetch('http://127.0.0.1:10014/_office/status', {
        redirect: 'error',
        signal: AbortSignal.timeout(3000),
      });
      if (!r.ok || (await r.json()).mode !== 'open') throw new Error();
    } catch {
      throw new ServiceUnavailableException('La Oficina está cerrada o no disponible.');
    }
    if (access.version !== b.prepared.actorVersion)
      throw new ConflictException('El acceso cambió. Prepara otra propuesta.');
    return RequestContextService.run({ userId: access.localAccountId }, () =>
      this.prisma.$transaction(
        async (tx) => {
          // The project mutex also protects task numbering. The receipt and task commit together.
          await tx.$queryRaw(
            Prisma.sql`SELECT id FROM projects WHERE id = ${b.prepared.projectId}::uuid FOR UPDATE`,
          );
          await this.scope(tx, access.localAccountId, b.prepared.operation, b.prepared.parameters);
          const previous = await tx.$queryRaw<ReceiptRow[]>(
            Prisma.sql`SELECT user_id,payload_hash,receipt_json FROM office_operation_receipts WHERE operation_id=${b.operationId}`,
          );
          if (previous[0]) {
            if (
              previous[0].user_id.toLowerCase() !== access.localAccountId ||
              previous[0].payload_hash !== payloadHash
            )
              throw new ConflictException('El folio corresponde a otra operación.');
            return { receipt: JSON.parse(previous[0].receipt_json) as Receipt };
          }
          const fresh = await this.prepareIn(
            tx,
            access,
            b.operationId,
            b.prepared.operation,
            parameters(b.prepared.operation, b.prepared.parameters),
          );
          if (digest(fresh) !== digest(b.prepared))
            throw new ConflictException('Los datos cambiaron. Prepara otra propuesta.');
          const scoped = this.tasks.withinOfficeTransaction(tx),
            task =
              b.prepared.operation === 'task.create'
                ? await scoped.create(
                    fresh.canonical as unknown as CreateTaskDto,
                    access.localAccountId,
                  )
                : await scoped.update(
                    fresh.parameters.taskId!,
                    fresh.canonical as UpdateTaskDto,
                    access.localAccountId,
                  );
          const project = await tx.project.findUniqueOrThrow({
            where: { id: task.projectId },
            include: { workspace: true },
          });
          const receipt: Receipt = {
            operationId: b.operationId,
            platform: 'taskosaur',
            resourceId: task.id,
            slug: task.slug,
            url:
              (this.config.get<string>('FRONTEND_URL') ?? '').replace(/\/$/, '') +
              '/' +
              encodeURIComponent(project.workspace.slug) +
              '/' +
              encodeURIComponent(project.slug) +
              '/tasks/' +
              encodeURIComponent(task.slug),
            summary: fresh.summary,
          };
          await tx.$executeRaw(
            Prisma.sql`INSERT INTO office_operation_receipts(operation_id,user_id,payload_hash,receipt_json,created_at) VALUES(${b.operationId},${access.localAccountId},${payloadHash},${JSON.stringify(receipt)},${new Date()})`,
          );
          await tx.activityLog.create({
            data: {
              type: b.prepared.operation === 'task.create' ? 'TASK_CREATED' : 'TASK_UPDATED',
              description: 'Cambio confirmado desde Oficina',
              entityType: 'Task',
              entityId: task.id,
              userId: access.localAccountId,
              organizationId: project.workspace.organizationId,
              newValue: { officeOperationId: b.operationId },
            },
          });
          return { receipt };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 20000 },
      ),
    );
  }
  async receipt(value: unknown) {
    const b = this.executeBody(value),
      access = await this.identity(b.actor);
    return this.prisma.$transaction(async (tx) => {
      await this.scope(tx, access.localAccountId, b.prepared.operation, b.prepared.parameters);
      const rows = await tx.$queryRaw<ReceiptRow[]>(
        Prisma.sql`SELECT user_id,payload_hash,receipt_json FROM office_operation_receipts WHERE operation_id=${b.operationId}`,
      );
      if (!rows[0]) return { receipt: null };
      if (
        rows[0].user_id.toLowerCase() !== access.localAccountId ||
        rows[0].payload_hash !== digest(b)
      )
        throw new ConflictException('Folio no disponible.');
      return { receipt: JSON.parse(rows[0].receipt_json) as Receipt };
    });
  }
  async query(value: unknown) {
    const b = object(value, ['actor', 'operation', 'parameters']),
      who = actor(b.actor),
      access = await this.identity(who),
      p = object(b.parameters, ['projectId', 'offset', 'reference']);
    const offset = p.offset === undefined ? 0 : p.offset;
    if (!Number.isSafeInteger(offset) || Number(offset) < 0 || Number(offset) > 10000)
      throw new BadRequestException('Página no válida.');
    return this.prisma.$transaction(async (tx) => {
      await this.user(tx, access.localAccountId);
      const acl = new AccessControlService(tx as PrismaService);
      if (b.operation === 'task.projects') {
        const candidates = await tx.project.findMany({
            where: {
              archive: false,
              workspace: { archive: false, organization: { archive: false } },
            },
            orderBy: { id: 'asc' },
            skip: Number(offset),
            take: 51,
            include: { workspace: { select: { name: true } } },
          }),
          projects = [] as Array<{
            id: string;
            name: string;
            workspace: string;
            canChange: boolean;
          }>;
        for (const project of candidates.slice(0, 50)) {
          try {
            const a = await acl.getProjectAccess(project.id, access.localAccountId);
            projects.push({
              id: project.id,
              name: project.name,
              workspace: project.workspace.name,
              canChange: a.canChange,
            });
          } catch (e) {
            if (!(e instanceof ForbiddenException) && !(e instanceof NotFoundException)) throw e;
          }
        }
        return { projects, nextOffset: candidates.length > 50 ? Number(offset) + 50 : null };
      }
      if (typeof p.projectId !== 'string' || !operationUuid.test(p.projectId))
        throw new BadRequestException('Selecciona un proyecto.');
      const { project } = await this.scope(tx, access.localAccountId, 'task.create', {
        projectId: p.projectId,
      });
      if (b.operation === 'task.lookup') {
        if (typeof p.reference !== 'string' || !p.reference || p.reference.length > 200)
          throw new BadRequestException('Referencia no válida.');
        const reference = p.reference;
        return {
          tasks: await tx.task.findMany({
            where: {
              projectId: project.id,
              isArchived: false,
              OR: [
                ...(operationUuid.test(reference) ? [{ id: reference }] : []),
                { slug: { equals: reference, mode: 'insensitive' } },
                { title: { equals: reference, mode: 'insensitive' } },
              ],
            },
            take: 3,
            select: { id: true, slug: true, title: true },
          }),
        };
      }
      if (b.operation === 'task.list') {
        const tasks = await tx.task.findMany({
          where: { projectId: project.id, isArchived: false },
          orderBy: { id: 'asc' },
          skip: Number(offset),
          take: 51,
          select: {
            id: true,
            slug: true,
            title: true,
            dueDate: true,
            status: { select: { name: true } },
          },
        });
        return {
          project: project.name,
          tasks: tasks.slice(0, 50),
          nextOffset: tasks.length > 50 ? Number(offset) + 50 : null,
        };
      }
      if (b.operation === 'task.options') {
        const statuses = await tx.taskStatus.findMany({
            where: { workflowId: project.workflowId, deletedAt: null },
            orderBy: { position: 'asc' },
            select: { id: true, name: true },
          }),
          members = await tx.projectMember.findMany({
            where: { projectId: project.id, user: { status: UserStatus.ACTIVE, deletedAt: null } },
            take: 100,
            select: { user: { select: { id: true, firstName: true, lastName: true } } },
          });
        return {
          project: project.name,
          statuses,
          assignees: members.map((m) => ({
            id: m.user.id,
            name: [m.user.firstName, m.user.lastName].filter(Boolean).join(' '),
          })),
        };
      }
      throw new BadRequestException('Consulta no permitida.');
    });
  }
}
