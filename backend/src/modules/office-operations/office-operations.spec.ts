import { ConfigService } from '@nestjs/config';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TasksService } from '../tasks/tasks.service';
import { CentralAccess } from '../auth/services/central-access';
import { AccessControlService } from 'src/common/access-control.utils';
import { OfficeOperationsService } from './office-operations.service';
import { OfficeOperationsGuard } from './office-operations.controller';
import { parameters, digest } from './operation-contract';
import { Prisma } from '@prisma/client';
jest.mock('../storage/storage.service', () => ({ StorageService: class {} }));

const actor = { issuer: 'https://identity.example.invalid/realm', subject: 'person' },
  userId = '11111111-1111-4111-8111-111111111111',
  projectId = '22222222-2222-4222-8222-222222222222',
  statusId = '33333333-3333-4333-8333-333333333333',
  operationId = '44444444-4444-4444-8444-444444444444',
  taskId = '55555555-5555-4555-8555-555555555555';
function fixture() {
  let state = {
      tasks: [] as Array<Record<string, unknown>>,
      receipts: [] as Array<{
        operation_id: string;
        user_id: string;
        payload_hash: string;
        receipt_json: string;
      }>,
      logs: 0,
    },
    writeFailure = false;
  const status = {
    id: statusId,
    name: 'Pendiente',
    workflowId: 'workflow',
    deletedAt: null,
    updatedAt: new Date('2026-11-09T12:00:00Z'),
  };
  const project = {
    id: projectId,
    name: 'Proyecto ficticio',
    workflowId: 'workflow',
    slug: 'project',
    archive: false,
    updatedAt: new Date('2026-11-09T12:00:00Z'),
    workspace: {
      id: 'workspace',
      name: 'Espacio ficticio',
      slug: 'workspace',
      archive: false,
      organizationId: 'org',
      organization: { archive: false },
    },
  };
  const txFor = (draft: typeof state) => ({
    user: {
      findUnique: jest.fn(async () => ({ id: userId, status: 'ACTIVE', deletedAt: null })),
      findMany: jest.fn(async () => []),
    },
    project: {
      findUnique: jest.fn(async () => project),
      findUniqueOrThrow: jest.fn(async () => project),
    },
    taskStatus: { findUnique: jest.fn(async () => status), findFirst: jest.fn(async () => status) },
    task: {
      findUnique: jest.fn(
        async ({ where }: { where: { id: string } }) =>
          draft.tasks.find((t) => t.id === where.id) ?? null,
      ),
    },
    activityLog: {
      create: jest.fn(async () => {
        draft.logs++;
        return {};
      }),
    },
    $queryRaw: jest.fn(async (sql: { strings: string[]; values: unknown[] }) =>
      sql.strings.join('').includes('office_operation_receipts')
        ? draft.receipts.filter((r) => r.operation_id === sql.values[0])
        : [{ id: projectId }],
    ),
    $executeRaw: jest.fn(async (sql: { values: unknown[] }) => {
      if (writeFailure) throw Error('receipt failure');
      const [id, user, hash, json] = sql.values as string[];
      draft.receipts.push({
        operation_id: id,
        user_id: user,
        payload_hash: hash,
        receipt_json: json,
      });
      return 1;
    }),
    draft,
  });
  const db = {
    $transaction: jest.fn(async (work: (tx: unknown) => Promise<unknown>) => {
      const draft = structuredClone(state),
        result = await work(txFor(draft));
      state = draft;
      return result;
    }),
  };
  const tasks = {
    withinOfficeTransaction: jest.fn((tx: ReturnType<typeof txFor>) => ({
      create: jest.fn(async (data: Record<string, unknown>) => {
        const task = { id: taskId, slug: 'PR-1', projectId, ...data };
        tx.draft.tasks.push(task);
        return task;
      }),
      update: jest.fn(async (id: string, data: Record<string, unknown>) => {
        const task = tx.draft.tasks.find((t) => t.id === id)!;
        Object.assign(task, data);
        return task;
      }),
    })),
  };
  const service = new OfficeOperationsService(
    db as unknown as PrismaService,
    tasks as unknown as TasksService,
    new ConfigService({
      CENTRAL_ACCESS_REQUIRED: 'true',
      FRONTEND_URL: 'https://projects.example.invalid',
    }),
  );
  return {
    service,
    db,
    tasks,
    state: () => state,
    failReceipt: () => {
      writeFailure = true;
    },
    seedTask: () => {
      state.tasks.push({
        id: taskId,
        slug: 'PR-OLD',
        projectId,
        title: 'Original',
        description: '',
        statusId,
        status,
        priority: 'MEDIUM',
        dueDate: null,
        startDate: null,
        updatedAt: new Date('2026-11-09T12:00:00Z'),
        assignees: [],
        isArchived: false,
      });
    },
  };
}
describe('Office operations: explicit confirmation adapter', () => {
  beforeEach(() => {
    jest
      .spyOn(CentralAccess.prototype, 'check')
      .mockResolvedValue({ localAccountId: userId, version: 1 });
    jest
      .spyOn(AccessControlService.prototype, 'getProjectAccess')
      .mockResolvedValue({ canChange: true, role: 'OWNER' } as never);
    jest
      .spyOn(AccessControlService.prototype, 'getTaskAccess')
      .mockResolvedValue({ canChange: true, role: 'OWNER' } as never);
    jest
      .spyOn(global, 'fetch')
      .mockImplementation(async () => new Response(JSON.stringify({ mode: 'open' })));
  });
  afterEach(() => jest.restoreAllMocks());
  it('preparation is read-only and receipt makes retries return the same task', async () => {
    const f = fixture(),
      prepared = await f.service.prepare({
        actor,
        operationId,
        operation: 'task.create',
        parameters: { projectId, title: 'Revisión ficticia' },
      });
    expect(f.state().tasks).toHaveLength(0);
    expect(f.tasks.withinOfficeTransaction).not.toHaveBeenCalled();
    const body = { actor, operationId, prepared },
      first = await f.service.execute(body),
      second = await f.service.execute(body);
    expect(first).toEqual(second);
    expect(f.state().tasks).toHaveLength(1);
    expect(f.state().receipts).toHaveLength(1);
    expect(f.state().logs).toBe(1);
    expect(f.tasks.withinOfficeTransaction).toHaveBeenCalledTimes(1);
    expect(first.receipt.url).toBe('https://projects.example.invalid/workspace/project/tasks/PR-1');
  });
  it('receipt failure rolls back the task instead of leaving an untracked creation', async () => {
    const f = fixture(),
      prepared = await f.service.prepare({
        actor,
        operationId,
        operation: 'task.create',
        parameters: { projectId, title: 'Revisión ficticia' },
      });
    f.failReceipt();
    await expect(f.service.execute({ actor, operationId, prepared })).rejects.toThrow(
      'receipt failure',
    );
    expect(f.state().tasks).toHaveLength(0);
    expect(f.state().receipts).toHaveLength(0);
  });
  it('permission change, changed proposal and closed Office prevent writes', async () => {
    const f = fixture(),
      prepared = await f.service.prepare({
        actor,
        operationId,
        operation: 'task.create',
        parameters: { projectId, title: 'Revisión ficticia' },
      });
    await expect(
      f.service.execute({
        actor,
        operationId,
        prepared: { ...prepared, canonical: { ...prepared.canonical, title: 'Different' } },
      }),
    ).rejects.toThrow('datos cambiaron');
    jest
      .mocked(AccessControlService.prototype.getProjectAccess)
      .mockRejectedValue(new ForbiddenException('revoked'));
    await expect(f.service.execute({ actor, operationId, prepared })).rejects.toThrow('revoked');
    jest.mocked(global.fetch).mockResolvedValue(new Response(JSON.stringify({ mode: 'closed' })));
    await expect(f.service.execute({ actor, operationId, prepared })).rejects.toThrow('cerrada');
    expect(f.state().tasks).toHaveLength(0);
  });
  it('parameter allowlist rejects role changes, paths, invalid dates and unknown priority', () => {
    expect(() =>
      parameters('task.create', { projectId, title: 'Test', role: 'SUPER_ADMIN' }),
    ).toThrow();
    expect(() =>
      parameters('task.create', { projectId, title: 'Test', dueDate: '2026-02-30' }),
    ).toThrow();
    expect(() =>
      parameters('task.create', { projectId, title: 'Test', priority: 'ADMIN' }),
    ).toThrow();
    expect(() => parameters('task.delete', { taskId })).toThrow();
    expect(digest({ b: 2, a: 1 })).toBe(digest({ a: 1, b: 2 }));
  });
  it('updates use the same receipt transaction and member restrictions', async () => {
    const f = fixture();
    f.seedTask();
    const prepared = await f.service.prepare({
      actor,
      operationId,
      operation: 'task.update',
      parameters: { taskId, title: 'Revisado' },
    });
    expect(f.state().tasks[0].title).toBe('Original');
    await f.service.execute({ actor, operationId, prepared });
    expect(f.state().tasks[0].title).toBe('Revisado');
    expect(f.state().receipts).toHaveLength(1);
    jest
      .mocked(AccessControlService.prototype.getTaskAccess)
      .mockResolvedValue({ canChange: true, role: 'MEMBER' } as never);
    await expect(
      f.service.prepare({
        actor,
        operationId,
        operation: 'task.update',
        parameters: { taskId, title: 'No permitido' },
      }),
    ).rejects.toThrow('solo puede cambiar el estado');
  });
  it('a central grant version change invalidates a prepared write', async () => {
    const f = fixture(),
      prepared = await f.service.prepare({
        actor,
        operationId,
        operation: 'task.create',
        parameters: { projectId, title: 'Test' },
      });
    jest
      .mocked(CentralAccess.prototype.check)
      .mockResolvedValue({ localAccountId: userId, version: 2 });
    await expect(f.service.execute({ actor, operationId, prepared })).rejects.toThrow(
      'acceso cambió',
    );
    expect(f.state().tasks).toHaveLength(0);
  });
  it('the real task creation rule uses the injected transaction, including ranks', async () => {
    const project = { id: projectId, workspace: { id: 'workspace', organization: { id: 'org' } } },
      ranks = { seedForTask: jest.fn() },
      rootTransaction = jest.fn(() => {
        throw Error('must not open another transaction');
      });
    const tx = {
      project: { findUnique: jest.fn(async () => project) },
      sprint: { findFirst: jest.fn(async () => ({ id: 'default-sprint' })) },
      $queryRaw: jest.fn(async () => [{ slug: 'PR', task_prefix: 'PR' }]),
      task: {
        findFirst: jest.fn(async () => null),
        create: jest.fn(async () => ({ id: taskId, projectId, slug: 'PR-1', project })),
      },
    };
    const root = new TasksService(
      { $transaction: rootTransaction } as unknown as PrismaService,
      {} as AccessControlService,
      {} as never,
      {} as never,
      ranks as never,
    );
    await root
      .withinOfficeTransaction(tx as unknown as Prisma.TransactionClient)
      .create({ title: 'Test', projectId, statusId }, userId);
    expect(rootTransaction).not.toHaveBeenCalled();
    expect(tx.task.create).toHaveBeenCalledTimes(1);
    expect(tx.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          project: { connect: { id: projectId } },
          status: { connect: { id: statusId } },
          createdByUser: { connect: { id: userId } },
          sprint: { connect: { id: 'default-sprint' } },
        }),
      }),
    );
    expect(ranks.seedForTask).toHaveBeenCalledWith(taskId, projectId, 'workspace', 'org', tx);
  });
  it('internal endpoints reject browsers, forwarded requests and incorrect credentials before SQL', () => {
    const token = 'test-credential-'.repeat(5),
      guard = new OfficeOperationsGuard(
        new ConfigService({
          OFFICE_OPERATIONS_ENABLED: 'true',
          OFFICE_OPERATIONS_ADAPTER_TOKEN: token,
        }),
      );
    const context = (headers: Record<string, string | undefined>) =>
      ({
        switchToHttp: () => ({
          getRequest: () => ({ socket: { remoteAddress: '127.0.0.1' }, headers }),
        }),
      }) as ExecutionContext;
    expect(guard.canActivate(context({ authorization: 'Bearer ' + token }))).toBe(true);
    for (const headers of [
      { authorization: 'Bearer wrong' },
      { authorization: 'Bearer ' + token, origin: 'https://browser.invalid' },
      { authorization: 'Bearer ' + token, 'x-forwarded-for': '203.0.113.1' },
    ])
      expect(() => guard.canActivate(context(headers))).toThrow();
  });
});
