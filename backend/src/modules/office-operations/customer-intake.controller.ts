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
import { CustomerIntakeService } from './customer-intake.service';
@Injectable()
export class CustomerIntakeGuard implements CanActivate {
  constructor(private config: ConfigService) {}
  canActivate(c: ExecutionContext) {
    const q = c.switchToHttp().getRequest<{
        headers: Record<string, string | undefined>;
        socket: { remoteAddress?: string };
      }>(),
      token = (q.headers.authorization ?? '').replace(/^Bearer /, ''),
      expected = this.config.get<string>('CUSTOMER_INTAKE_ADAPTER_TOKEN') ?? '';
    if (this.config.get<string>('CUSTOMER_INTAKE_ENABLED') !== 'true')
      throw new NotFoundException();
    if (
      !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(q.socket.remoteAddress ?? '') ||
      q.headers.origin ||
      q.headers['x-forwarded-for'] ||
      q.headers.forwarded ||
      q.headers['cf-connecting-ip'] ||
      expected.length < 48 ||
      token.length > 256 ||
      !timingSafeEqual(
        createHash('sha256').update(token).digest(),
        createHash('sha256').update(expected).digest(),
      )
    )
      throw new ForbiddenException();
    return true;
  }
}
@Public()
@UseGuards(CustomerIntakeGuard)
@Controller('customer-intake')
export class CustomerIntakeController {
  constructor(private service: CustomerIntakeService) {}
  @Post('provision') provision(@Body() body: unknown) {
    return this.service.provision(body);
  }
  @Post('plan') plan(@Body() body: unknown) {
    return this.service.plan(body);
  }
  @Post('activate') activate(@Body() body: { payload?: unknown; planHash?: string }) {
    if (!body || typeof body.planHash !== 'string') throw new ForbiddenException();
    return this.service.activate(body.payload, body.planHash);
  }
}
