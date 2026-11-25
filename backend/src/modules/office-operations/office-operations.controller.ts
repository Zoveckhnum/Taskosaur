import {
  Body,
  CanActivate,
  Controller,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'node:crypto';
import { Public } from '../auth/decorators/public.decorator';
import { OfficeOperationsService } from './office-operations.service';
@Injectable()
export class OfficeOperationsGuard implements CanActivate {
  constructor(private config: ConfigService) {}
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<{
      socket: { remoteAddress?: string };
      headers: Record<string, string | undefined>;
    }>();
    if (this.config.get<string>('OFFICE_OPERATIONS_ENABLED') !== 'true')
      throw new NotFoundException();
    const token = (req.headers.authorization ?? '').replace(/^Bearer /, ''),
      expected = this.config.get<string>('OFFICE_OPERATIONS_ADAPTER_TOKEN') ?? '';
    if (
      !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '') ||
      req.headers.origin ||
      req.headers['x-forwarded-for'] ||
      req.headers.forwarded ||
      req.headers['cf-connecting-ip'] ||
      expected.length < 48 ||
      token.length > 256 ||
      !timingSafeEqual(
        createHash('sha256').update(token).digest(),
        createHash('sha256').update(expected).digest(),
      )
    )
      throw new ForbiddenException('Conexión no autorizada.');
    return true;
  }
}
@Public()
@UseGuards(OfficeOperationsGuard)
@Controller('office-operations/internal')
export class OfficeOperationsController {
  constructor(private operations: OfficeOperationsService) {}
  @Post('prepare') prepare(@Body() body: unknown) {
    return this.operations.prepare(body);
  }
  @Post('authorize') authorize(@Body() body: unknown) {
    return this.operations.authorize(body);
  }
  @Post('query') query(@Body() body: unknown) {
    return this.operations.query(body);
  }
  @Post('execute') execute(@Body() body: unknown) {
    return this.operations.execute(body);
  }
  @Post('receipt') receipt(@Body() body: unknown) {
    return this.operations.receipt(body);
  }
}
