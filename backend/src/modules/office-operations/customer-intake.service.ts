import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { ProjectsService } from '../projects/projects.service';
import { TasksService } from '../tasks/tasks.service';
import { CentralAccess } from '../auth/services/central-access';
import { digest, operationUuid } from './operation-contract';
import { sanitizeText } from 'src/common/utils/sanitizer.util';
import { buildCustomerExecutionPlan } from './customer-execution-plan';
const escape = (v: string) =>
  v.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
type CustomerIntake = {
  id: string;
  companyId: string;
  title: string;
  need: string;
  catalogVersion: string;
  diagnostic: 'D01' | 'D02' | null;
  infrastructure:
    | { mode: 'none' }
    | {
        mode: 'vps';
        contracting: 'client_direct' | 'iqualitys_assisted';
        operations: 'client_managed' | 'iqualitys_managed';
        managementPlan: 'INF06' | 'INF07' | 'INF08' | null;
      };
  customer: {
    companyId: string;
    company: string;
    name: string;
    email: string;
    phone: string;
    position: string;
  };
  estimate: {
    lines: {
      code: string;
      name: string;
      quantity: number;
      subtotalCents: number;
      cadence: 'once' | 'monthly';
    }[];
    firstPeriod: { totalCents: number };
  };
};
type CustomerReceipt = {
  workspaceId: string;
  projectId: string;
  taskId: string;
  requestId: string;
  executionPlan?: {
    version: string;
    planHash: string;
    generatedAt: string;
    taskCount: number;
    phaseCount: number;
    dependencyCount: number;
    recurringServices: number;
    taskIds: Record<string, string>;
  };
};
const object = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const text = (v: unknown, min: number, max: number): v is string =>
  typeof v === 'string' && v.trim().length >= min && v.length <= max;
const amount = (v: unknown): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const receipt = (value: string): CustomerReceipt => {
  const parsed: unknown = JSON.parse(value);
  if (
    !object(parsed) ||
    typeof parsed.workspaceId !== 'string' ||
    !operationUuid.test(parsed.workspaceId) ||
    typeof parsed.projectId !== 'string' ||
    !operationUuid.test(parsed.projectId) ||
    typeof parsed.taskId !== 'string' ||
    !operationUuid.test(parsed.taskId) ||
    typeof parsed.requestId !== 'string' ||
    !operationUuid.test(parsed.requestId) ||
    (parsed.executionPlan !== undefined && !object(parsed.executionPlan))
  )
    throw new ServiceUnavailableException('El recibo de Proyectos no es válido.');
  return parsed as CustomerReceipt;
};
export function validateCustomerIntake(value: unknown): CustomerIntake {
  const invalid = () => {
    throw new BadRequestException('Solicitud no v\u00e1lida.');
  };
  if (!object(value)) return invalid();
  const c = value.customer,
    e = value.estimate,
    infrastructure = value.infrastructure,
    validInfrastructure =
      object(infrastructure) &&
      (infrastructure.mode === 'none' ||
        (infrastructure.mode === 'vps' &&
          (infrastructure.contracting === 'client_direct' ||
            infrastructure.contracting === 'iqualitys_assisted') &&
          ((infrastructure.operations === 'client_managed' &&
            infrastructure.managementPlan === null) ||
            (infrastructure.operations === 'iqualitys_managed' &&
              (infrastructure.managementPlan === 'INF06' ||
                infrastructure.managementPlan === 'INF07' ||
                infrastructure.managementPlan === 'INF08')))));
  if (
    !text(value.id, 36, 36) ||
    !operationUuid.test(value.id) ||
    !text(value.companyId, 36, 36) ||
    !operationUuid.test(value.companyId) ||
    !text(value.title, 5, 160) ||
    !text(value.need, 10, 4000) ||
    !text(value.catalogVersion, 1, 100) ||
    !validInfrastructure ||
    !object(c) ||
    c.companyId !== value.companyId ||
    !text(c.company, 2, 100) ||
    !text(c.name, 2, 100) ||
    !text(c.email, 3, 254) ||
    !text(c.phone, 0, 30) ||
    !text(c.position, 0, 100) ||
    !object(e) ||
    !Array.isArray(e.lines) ||
    e.lines.length < 1 ||
    e.lines.length > 57 ||
    !e.lines.every(
      (line: unknown) =>
        object(line) &&
        text(line.code, 3, 10) &&
        text(line.name, 1, 250) &&
        amount(line.subtotalCents) &&
        amount(line.quantity) &&
        line.quantity >= 1 &&
        line.quantity <= 100 &&
        (line.cadence === 'once' || line.cadence === 'monthly'),
    ) ||
    !object(e.firstPeriod) ||
    !amount(e.firstPeriod.totalCents) ||
    (value.diagnostic !== null && value.diagnostic !== 'D01' && value.diagnostic !== 'D02')
  )
    return invalid();
  return value as CustomerIntake;
}
@Injectable()
export class CustomerIntakeService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private workspaces: WorkspacesService,
    private projects: ProjectsService,
    private tasks: TasksService,
  ) {}
  private async authorize() {
    const owner = this.config.get<string>('CUSTOMER_INTAKE_OWNER_ID') ?? '',
      organization = this.config.get<string>('CUSTOMER_INTAKE_ORGANIZATION_ID') ?? '';
    if (!operationUuid.test(owner) || !operationUuid.test(organization))
      throw new ServiceUnavailableException('Recepción no configurada.');
    const central = await new CentralAccess(this.config).check(
      this.config.get<string>('CENTRAL_OIDC_ISSUER') ?? '',
      this.config.get<string>('CUSTOMER_INTAKE_OWNER_SUBJECT') ?? '',
    );
    if (central.localAccountId !== owner) throw new ForbiddenException();
    const ownerRow = await this.prisma.user.findUnique({
      where: { id: owner },
      select: { status: true, deletedAt: true },
    });
    if (ownerRow?.status !== 'ACTIVE' || ownerRow.deletedAt) throw new ForbiddenException();
    return { owner, organization };
  }
  async plan(value: unknown) {
    const b = validateCustomerIntake(value);
    await this.authorize();
    const fingerprint = digest(b),
      old = await this.prisma.$queryRaw<{ payload_hash: string }[]>(
        Prisma.sql`SELECT payload_hash FROM office_customer_receipts WHERE request_id=${b.id}`,
      );
    if (!old[0] || old[0].payload_hash !== fingerprint)
      throw new BadRequestException('La solicitud no corresponde al folio vigente.');
    return buildCustomerExecutionPlan(b.title, b.estimate.lines);
  }
  async activate(value: unknown, planHash: string) {
    const b = validateCustomerIntake(value),
      { owner } = await this.authorize(),
      fingerprint = digest(b),
      plan = buildCustomerExecutionPlan(b.title, b.estimate.lines);
    if (!/^[a-f0-9]{64}$/.test(planHash) || plan.hash !== planHash)
      throw new BadRequestException('El plan cambió. Revísalo nuevamente.');
    return this.prisma.$transaction(
      async (tx) => {
        const rows = await tx.$queryRaw<{ payload_hash: string; receipt_json: string }[]>(
          Prisma.sql`SELECT payload_hash,receipt_json FROM office_customer_receipts WHERE request_id=${b.id} FOR UPDATE`,
        );
        if (!rows[0] || rows[0].payload_hash !== fingerprint)
          throw new BadRequestException('La solicitud no corresponde al folio vigente.');
        const currentReceipt = receipt(rows[0].receipt_json);
        if (currentReceipt.executionPlan) {
          if (currentReceipt.executionPlan.planHash !== planHash)
            throw new BadRequestException('El folio ya tiene otro plan de ejecución.');
          return currentReceipt;
        }
        const project = await tx.project.findUnique({
          where: { id: currentReceipt.projectId },
          select: { id: true, workflowId: true, archive: true },
        });
        if (!project || project.archive)
          throw new ForbiddenException('El proyecto no está disponible.');
        const [status, completedStatus] = await Promise.all([
          tx.taskStatus.findFirst({
            where: { workflowId: project.workflowId, deletedAt: null, category: 'TODO' },
            orderBy: [{ isDefault: 'desc' }, { position: 'asc' }, { id: 'asc' }],
            select: { id: true },
          }),
          tx.taskStatus.findFirst({
            where: { workflowId: project.workflowId, deletedAt: null, category: 'DONE' },
            orderBy: [{ isDefault: 'desc' }, { position: 'asc' }, { id: 'asc' }],
            select: { id: true },
          }),
        ]);
        if (!status || !completedStatus)
          throw new ServiceUnavailableException('El flujo requiere estados inicial y final.');
        const ids = new Map<string, string>(),
          taskService = this.tasks.withinOfficeTransaction(tx);
        for (const item of plan.tasks) {
          const parentTaskId = item.parentKey ? ids.get(item.parentKey) : undefined;
          if (item.parentKey && !parentTaskId)
            throw new ServiceUnavailableException('La jerarquía del plan no es válida.');
          const task = await taskService.create(
            {
              projectId: project.id,
              statusId: status.id,
              title: item.title,
              description: `<p>${escape(item.description)}</p><p>Fase: ${escape(item.phase)}${item.serviceCode ? ' · Servicio: ' + escape(item.serviceCode) : ''}.</p>`,
              type: item.type,
              priority: item.priority,
              parentTaskId,
              allowEmailReplies: false,
              isRecurring: false,
              originalEstimate: item.type === 'TASK' ? 480 : undefined,
              remainingEstimate: item.type === 'TASK' ? 480 : undefined,
              customFields: {
                source: 'iqualitys-execution-plan',
                requestId: b.id,
                planVersion: plan.version,
                planHash: plan.hash,
                templateKey: item.key,
                phase: item.phase,
                serviceCode: item.serviceCode ?? null,
              },
            } as never,
            owner,
          );
          ids.set(item.key, task.id);
        }
        const dependencies = [
          { dependentTaskId: ids.get('inicio')!, blockingTaskId: currentReceipt.taskId },
          ...plan.tasks.flatMap((item) =>
            item.dependsOn.map((blocker) => ({
              dependentTaskId: ids.get(item.key)!,
              blockingTaskId: ids.get(blocker)!,
            })),
          ),
        ];
        for (const dependency of dependencies)
          await tx.taskDependency.create({
            data: { ...dependency, type: 'BLOCKS', createdBy: owner },
          });
        await tx.task.update({
          where: { id: currentReceipt.taskId },
          data: { statusId: completedStatus.id, completedAt: new Date() },
        });
        await tx.project.update({ where: { id: project.id }, data: { status: 'ACTIVE' } });
        const executionPlan = {
          version: plan.version,
          planHash: plan.hash,
          generatedAt: new Date().toISOString(),
          taskCount: plan.summary.activities,
          phaseCount: plan.summary.phases,
          dependencyCount: dependencies.length,
          recurringServices: plan.summary.recurringServices,
          taskIds: Object.fromEntries(ids),
        };
        const next: CustomerReceipt = { ...currentReceipt, executionPlan };
        await tx.$executeRaw(
          Prisma.sql`UPDATE office_customer_receipts SET receipt_json=${JSON.stringify(next)} WHERE request_id=${b.id}`,
        );
        return next;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 120000 },
    );
  }
  async provision(value: unknown) {
    const b = validateCustomerIntake(value),
      { owner, organization } = await this.authorize();
    const fingerprint = digest(b);
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw(
          Prisma.sql`SELECT id FROM organizations WHERE id=${organization}::uuid FOR UPDATE`,
        );
        const old = await tx.$queryRaw<{ payload_hash: string; receipt_json: string }[]>(
          Prisma.sql`SELECT payload_hash,receipt_json FROM office_customer_receipts WHERE request_id=${b.id}`,
        );
        if (old[0]) {
          if (old[0].payload_hash !== fingerprint)
            throw new BadRequestException('El folio cambió.');
          return JSON.parse(old[0].receipt_json) as Record<string, string>;
        }
        const mapping = await tx.$queryRaw<{ workspace_id: string }[]>(
          Prisma.sql`SELECT workspace_id FROM office_customer_companies WHERE company_id=${b.companyId}`,
        );
        let workspaceId = mapping[0]?.workspace_id;
        if (!workspaceId) {
          const workspace = await this.workspaces.withinCustomerTransaction(tx).create(
            {
              name: sanitizeText(b.customer.company),
              slug: 'cliente-' + b.companyId.replaceAll('-', '').slice(0, 20),
              organizationId: organization,
              color: '#104f60',
              inheritMembers: false,
              settings: { source: 'iqualitys-quotes', companyId: b.companyId },
              description: 'Solicitud comercial de ' + sanitizeText(b.customer.company),
            } as never,
            owner,
          );
          workspaceId = workspace.id;
          await tx.$executeRaw(
            Prisma.sql`INSERT INTO office_customer_companies(company_id,workspace_id) VALUES(${b.companyId},${workspaceId})`,
          );
        }
        const workspace = await tx.workspace.findUnique({
          where: { id: workspaceId },
          select: { organizationId: true, archive: true },
        });
        if (!workspace || workspace.organizationId !== organization || workspace.archive)
          throw new ForbiddenException('El espacio no está disponible.');
        const project = await this.projects.withinCustomerTransaction(tx).create(
          {
            workspaceId,
            name: sanitizeText(b.title),
            slug: 'solicitud-' + b.id.replaceAll('-', '').slice(0, 20),
            color: '#104f60',
            status: 'PLANNING',
            visibility: 'PRIVATE',
            settings: { source: 'iqualitys-quotes', requestId: b.id, companyId: b.companyId },
            description: 'Solicitud para revisión comercial. No constituye contrato ni pago.',
          } as never,
          owner,
        );
        const initialStatus = await tx.taskStatus.findFirst({
          where: { workflowId: project.workflowId, deletedAt: null, category: 'TODO' },
          orderBy: [{ isDefault: 'desc' }, { position: 'asc' }, { id: 'asc' }],
          select: { id: true },
        });
        if (!initialStatus)
          throw new ServiceUnavailableException(
            'El flujo del proyecto no tiene un estado inicial disponible.',
          );
        const infrastructureSummary =
          b.infrastructure.mode === 'none'
            ? ''
            : '<h3>Infraestructura y responsabilidades</h3><ul><li>Titular de la cuenta, contrato y datos: cliente.</li><li>Contratación del proveedor: ' +
              (b.infrastructure.contracting === 'iqualitys_assisted'
                ? 'cliente con asistencia de iqualitys (ADM01).'
                : 'cliente directamente; debe entregar acceso administrativo delegado, dominio/DNS autorizado, datos fiscales y medio de pago al proveedor.') +
              '</li><li>Operación posterior: ' +
              (b.infrastructure.operations === 'iqualitys_managed'
                ? 'iqualitys mediante ' + b.infrastructure.managementPlan + '.'
                : 'cliente; iqualitys entrega inventario, accesos y comprobaciones de puesta en marcha.') +
              '</li><li>El costo del proveedor no está incluido ni se muestra en esta solicitud.</li></ul>';
        const summary =
          '<h2>Solicitud comercial · pendiente de revisión</h2><p>' +
          escape(b.need) +
          '</p><p>Contacto: ' +
          escape(b.customer.name) +
          ' · ' +
          escape(b.customer.email) +
          ' · ' +
          escape(b.customer.phone ?? '') +
          '</p><ul>' +
          b.estimate.lines
            .map((l) => '<li>' + escape(l.code + ' · ' + l.name) + ' × ' + l.quantity + '</li>')
            .join('') +
          '</ul>' +
          infrastructureSummary +
          '<p>Folio: ' +
          b.id +
          '. Costos estimados, sujeto a revisión de alcance y coberturas. No iniciar servicios automáticamente.</p>';
        const task = await this.tasks.withinOfficeTransaction(tx).create(
          {
            projectId: project.id,
            statusId: initialStatus.id,
            title: 'Revisar solicitud y confirmar alcance',
            description: summary,
            allowEmailReplies: false,
            isRecurring: false,
            customFields: {
              customerRequestId: b.id,
              catalogVersion: b.catalogVersion,
              infrastructure: b.infrastructure,
            },
          } as never,
          owner,
        );
        const receipt = { workspaceId, projectId: project.id, taskId: task.id, requestId: b.id };
        await tx.$executeRaw(
          Prisma.sql`INSERT INTO office_customer_receipts(request_id,company_id,payload_hash,receipt_json) VALUES(${b.id},${b.companyId},${fingerprint},${JSON.stringify(receipt)})`,
        );
        return receipt;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 45000 },
    );
  }
}
