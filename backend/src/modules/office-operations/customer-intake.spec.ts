import { ConfigService } from '@nestjs/config';
import { CustomerIntakeService } from './customer-intake.service';
import { CentralAccess } from '../auth/services/central-access';
jest.mock('../storage/storage.service', () => ({ StorageService: class {} }));
const uid = '11111111-1111-4111-8111-111111111111',
  org = '22222222-2222-4222-8222-222222222222';
const payload = {
  id: '33333333-3333-4333-8333-333333333333',
  companyId: '44444444-4444-4444-8444-444444444444',
  title: 'Solicitud ficticia',
  need: 'Necesidad de prueba',
  customer: {
    companyId: '44444444-4444-4444-8444-444444444444',
    company: 'Empresa ficticia',
    name: 'Persona ficticia',
    email: 'qa@example.invalid',
    phone: '5550000000',
    position: '',
  },
  estimate: {
    lines: [{ code: 'D00', name: 'Conversación', quantity: 1, subtotalCents: 0, cadence: 'once' }],
    firstPeriod: { totalCents: 0 },
  },
  diagnostic: null,
  infrastructure: { mode: 'none' },
  catalogVersion: 'fixture',
};
describe('customer intake transaction', () => {
  afterEach(() => jest.restoreAllMocks());
  function fixture() {
    let state = {
        workspace: false,
        projects: 0,
        tasks: 0,
        receipt: null as null | { payload_hash: string; receipt_json: string },
      },
      fail = false;
    const scoped = (kind: 'workspace' | 'project' | 'task') => ({
      withinCustomerTransaction: (tx: any) => ({
        create: async (data: any, owner: string) => {
          expect(owner).toBe(uid);
          if (kind === 'workspace') {
            expect(data.inheritMembers).toBe(false);
            expect(data.name).toBe(payload.customer.company);
            tx.draft.workspace = true;
            return { id: 'workspace' };
          }
          expect(data.visibility).toBe('PRIVATE');
          expect(data.name).toBe(payload.title);
          tx.draft.projects++;
          return { id: 'project', workflowId: 'workflow' };
        },
      }),
      withinOfficeTransaction: (tx: any) => ({
        create: async (data: any) => {
          expect(data.projectId).toBe('project');
          expect(data.statusId).toBe('initial-status');
          tx.draft.tasks++;
          return { id: 'task' };
        },
      }),
    });
    const prisma = {
      user: { findUnique: async () => ({ status: 'ACTIVE', deletedAt: null }) },
      $transaction: async (work: any) => {
        const draft = structuredClone(state);
        const tx = {
          draft,
          workspace: { findUnique: async () => ({ organizationId: org, archive: false }) },
          taskStatus: {
            findFirst: async (args: any) => {
              expect(args.where).toEqual({
                workflowId: 'workflow',
                deletedAt: null,
                category: 'TODO',
              });
              expect(args.orderBy).toEqual([
                { isDefault: 'desc' },
                { position: 'asc' },
                { id: 'asc' },
              ]);
              return { id: 'initial-status' };
            },
          },
          $queryRaw: async (sql: any) => {
            const text = sql.strings.join('');
            if (text.includes('office_customer_receipts'))
              return draft.receipt ? [draft.receipt] : [];
            if (text.includes('office_customer_companies'))
              return draft.workspace ? [{ workspace_id: 'workspace' }] : [];
            return [{ id: org }];
          },
          $executeRaw: async (sql: any) => {
            if (sql.strings.join('').includes('office_customer_receipts')) {
              if (fail) throw Error('receipt failure');
              draft.receipt = { payload_hash: sql.values[2], receipt_json: sql.values[3] };
            }
            return 1;
          },
        };
        const result = await work(tx);
        state = draft;
        return result;
      },
    };
    jest
      .spyOn(CentralAccess.prototype, 'check')
      .mockResolvedValue({ localAccountId: uid } as never);
    const service = new CustomerIntakeService(
      prisma as never,
      new ConfigService({ CUSTOMER_INTAKE_OWNER_ID: uid, CUSTOMER_INTAKE_ORGANIZATION_ID: org }),
      scoped('workspace') as never,
      scoped('project') as never,
      scoped('task') as never,
    );
    return {
      service,
      state: () => state,
      fail: () => {
        fail = true;
      },
    };
  }
  it('creates private resources once and rejects changes to a consumed folio', async () => {
    const f = fixture();
    const first = await f.service.provision(payload);
    expect(await f.service.provision(payload)).toEqual(first);
    expect(f.state()).toMatchObject({ projects: 1, tasks: 1, workspace: true });
    await expect(f.service.provision({ ...payload, title: 'Changed title' })).rejects.toThrow();
  });
  it('receipt failure rolls back workspace, project and task together', async () => {
    const f = fixture();
    f.fail();
    await expect(f.service.provision(payload)).rejects.toThrow('receipt failure');
    expect(f.state()).toEqual({ workspace: false, projects: 0, tasks: 0, receipt: null });
  });
  it('revoked central permission prevents all writes', async () => {
    const f = fixture();
    jest.spyOn(CentralAccess.prototype, 'check').mockRejectedValue(Error('revoked'));
    await expect(f.service.provision(payload)).rejects.toThrow('revoked');
    expect(f.state().projects).toBe(0);
  });
});
