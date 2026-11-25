import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { TaskPriority } from '@prisma/client';
import { sanitizeHtml, sanitizeText } from 'src/common/utils/sanitizer.util';
export const operationUuid =
  /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export function canonical(value: unknown): string {
  return JSON.stringify(sorted(value));
}
function sorted(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sorted);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, sorted((value as Record<string, unknown>)[k])]),
    );
  return value;
}
export const digest = (value: unknown) =>
  createHash('sha256').update(canonical(value)).digest('hex');
export function object(value: unknown, keys: string[]): Record<string, unknown> {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).some((k) => !keys.includes(k))
  )
    throw new BadRequestException('Parámetros no permitidos.');
  return value as Record<string, unknown>;
}
export function actor(value: unknown): { issuer: string; subject: string } {
  const a = object(value, ['issuer', 'subject']);
  if (
    typeof a.issuer !== 'string' ||
    !a.issuer ||
    a.issuer.length > 512 ||
    typeof a.subject !== 'string' ||
    !a.subject ||
    a.subject.length > 255
  )
    throw new BadRequestException('Identidad no válida.');
  return { issuer: a.issuer, subject: a.subject };
}
export type TaskOperationParameters = {
  projectId?: string;
  taskId?: string;
  title?: string;
  description?: string;
  priority?: TaskPriority;
  statusId?: string;
  assigneeIds?: string[];
  dueDate?: string;
};
export function parameters(operation: string, value: unknown): TaskOperationParameters {
  const create = operation === 'task.create';
  if (!create && operation !== 'task.update')
    throw new BadRequestException('Operación no permitida.');
  const b = object(value, [
      create ? 'projectId' : 'taskId',
      'title',
      'description',
      'priority',
      'statusId',
      'assigneeIds',
      'dueDate',
    ]),
    id = b[create ? 'projectId' : 'taskId'];
  if (typeof id !== 'string' || !uuid.test(id))
    throw new BadRequestException('Selecciona el identificador de proyecto o tarea.');
  const result: TaskOperationParameters = create
    ? { projectId: id.toLowerCase() }
    : { taskId: id.toLowerCase() };
  for (const field of ['title', 'description'] as const)
    if (b[field] !== undefined) {
      if (typeof b[field] !== 'string' || b[field].length > (field === 'title' ? 200 : 2000))
        throw new BadRequestException('Texto no válido.');
      result[field] = field === 'title' ? sanitizeText(b[field]).trim() : sanitizeHtml(b[field]);
    }
  if ((create || b.title !== undefined) && !result.title)
    throw new BadRequestException('Escribe el título de la tarea.');
  if (b.priority !== undefined) {
    if (!Object.values(TaskPriority).includes(b.priority as TaskPriority))
      throw new BadRequestException('Prioridad no válida.');
    result.priority = b.priority as TaskPriority;
  }
  if (b.statusId !== undefined) {
    if (typeof b.statusId !== 'string' || !uuid.test(b.statusId))
      throw new BadRequestException('Estado no válido.');
    result.statusId = b.statusId.toLowerCase();
  }
  if (b.assigneeIds !== undefined) {
    if (
      !Array.isArray(b.assigneeIds) ||
      b.assigneeIds.length > 10 ||
      b.assigneeIds.some((v) => typeof v !== 'string' || !uuid.test(v)) ||
      new Set(b.assigneeIds).size !== b.assigneeIds.length
    )
      throw new BadRequestException('Selecciona responsables válidos.');
    result.assigneeIds = b.assigneeIds.map((v: string) => v.toLowerCase());
  }
  if (b.dueDate !== undefined) {
    if (
      typeof b.dueDate !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(b.dueDate) ||
      Number.isNaN(Date.parse(b.dueDate)) ||
      new Date(b.dueDate + 'T00:00:00Z').toISOString().slice(0, 10) !== b.dueDate
    )
      throw new BadRequestException('Usa una fecha válida AAAA-MM-DD.');
    result.dueDate = b.dueDate;
  }
  if (!create && Object.keys(result).length === 1)
    throw new BadRequestException('Indica qué cambiar en la tarea.');
  return result;
}
