import {
  Body,
  Controller,
  ForbiddenException,
  Param,
  Post,
  ServiceUnavailableException,
  UseGuards,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CentralAccess } from '../auth/services/central-access';
import { actor, object, operationUuid } from './operation-contract';
@UseGuards(JwtAuthGuard)
@Controller('office-requests')
export class OfficeRequestsController {
  constructor(private config: ConfigService) {}
  private async identity(userId: string) {
    if (this.config.get<string>('CENTRAL_ACCESS_REQUIRED') !== 'true')
      throw new ForbiddenException('Usa el acceso central.');
    const raw = this.config.get<string>('CENTRAL_PORTAL_ORIGIN') ?? '',
      token = this.config.get<string>('CENTRAL_PORTAL_SERVICE_TOKEN') ?? '';
    let origin: URL;
    try {
      origin = new URL(raw);
      if (
        origin.username ||
        origin.password ||
        origin.pathname !== '/' ||
        origin.search ||
        origin.hash ||
        token.length < 48 ||
        (origin.protocol !== 'https:' &&
          !(origin.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(origin.hostname)))
      )
        throw new Error();
    } catch {
      throw new ServiceUnavailableException('Acceso central no configurado.');
    }
    let r: Response;
    try {
      r = await fetch(new URL('/api/service/taskosaur/identity', origin), {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(5000),
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ localAccountId: userId }),
      });
    } catch {
      throw new ServiceUnavailableException('Acceso central no disponible.');
    }
    if (!r.ok) throw new ForbiddenException('Acceso central no disponible para esta cuenta.');
    const value = await r.json();
    if (
      value.allowed !== true ||
      value.localAccountId !== userId ||
      value.issuer !== this.config.get<string>('CENTRAL_OIDC_ISSUER')
    )
      throw new ForbiddenException('Vínculo central no válido.');
    const who = actor({ issuer: value.issuer, subject: value.subject });
    await new CentralAccess(this.config).check(who.issuer, who.subject);
    return who;
  }
  private async call(path: string, userId: string, body: Record<string, unknown>) {
    const base = this.config.get<string>('OFFICE_OPERATIONS_URL'),
      token = this.config.get<string>('OFFICE_OPERATIONS_TOKEN') ?? '';
    if (base !== 'http://127.0.0.1:10011/api/integrations/operations' || token.length < 48)
      throw new ServiceUnavailableException(
        'La comunicación de actividades con Oficina no está configurada.',
      );
    const who = await this.identity(userId);
    let r: Response;
    try {
      r = await fetch(base + path, {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(20000),
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, actor: who }),
      });
    } catch {
      throw new ServiceUnavailableException(
        'No se confirmó el resultado. Consulta el folio antes de repetir.',
      );
    }
    const value = await r.json();
    if (!r.ok) {
      const message = value.error?.message ?? 'No se completó la operación.';
      if (r.status === 409) throw new ConflictException(message);
      if (r.status === 403) throw new ForbiddenException(message);
      throw new ServiceUnavailableException(message);
    }
    return value as unknown;
  }
  @Post('query') query(@CurrentUser() user: { id: string }, @Body() body: unknown) {
    const b = object(body, ['operation', 'parameters']);
    if (
      !['task.projects', 'task.list', 'task.lookup', 'task.options', 'agenda.list'].includes(
        String(b.operation),
      )
    )
      throw new BadRequestException('Consulta no válida.');
    return this.call('/query', user.id, b);
  }
  @Post('prepare') prepare(@CurrentUser() user: { id: string }, @Body() body: unknown) {
    const b = object(body, ['requestId', 'operation', 'parameters']);
    if (
      typeof b.requestId !== 'string' ||
      !operationUuid.test(b.requestId) ||
      !['task.create', 'task.update', 'agenda.create', 'agenda.update'].includes(
        String(b.operation),
      )
    )
      throw new BadRequestException('Propuesta no válida.');
    return this.call('/prepare', user.id, { ...b, channel: 'portal' });
  }
  @Post(':id/status') status(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    object(body, []);
    if (!operationUuid.test(id)) throw new BadRequestException('Folio no válido.');
    return this.call('/' + id + '/status', user.id, {});
  }
  @Post(':id/confirm') confirm(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const b = object(body, ['confirmationToken', 'proposalHash']);
    if (
      !operationUuid.test(id) ||
      typeof b.confirmationToken !== 'string' ||
      b.confirmationToken.length > 128 ||
      typeof b.proposalHash !== 'string' ||
      !/^[a-f0-9]{64}$/.test(b.proposalHash)
    )
      throw new BadRequestException('Confirmación no válida.');
    return this.call('/' + id + '/confirm', user.id, b);
  }
  @Post(':id/cancel') cancel(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const b = object(body, ['confirmationToken', 'proposalHash']);
    if (!operationUuid.test(id)) throw new BadRequestException('Folio no válido.');
    return this.call('/' + id + '/cancel', user.id, b);
  }
}
