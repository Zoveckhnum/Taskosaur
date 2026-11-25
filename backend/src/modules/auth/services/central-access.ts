import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ServiceUnavailableException } from '@nestjs/common';

export interface CentralBinding {
  hubIssuer?: string;
  hubSubject?: string;
  hubVersion?: number;
}

// Explicitly opt-in: existing installations retain their authentication until rollout.
export class CentralAccess {
  constructor(
    private config: ConfigService,
    private request: typeof fetch = fetch,
  ) {}

  get enabled() {
    return this.config.get<string>('CENTRAL_ACCESS_REQUIRED') === 'true';
  }

  async check(
    issuer: string,
    subject: string,
  ): Promise<{ localAccountId: string; version: number }> {
    const origin = this.config.get<string>('CENTRAL_PORTAL_ORIGIN') || '';
    const token = this.config.get<string>('CENTRAL_PORTAL_SERVICE_TOKEN') || '';
    const expectedIssuer = this.config.get<string>('CENTRAL_OIDC_ISSUER') || '';
    let url: URL;
    try {
      url = new URL(origin);
      const local = ['127.0.0.1', 'localhost'].includes(url.hostname);
      if (
        (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) ||
        url.username ||
        url.password ||
        url.pathname !== '/' ||
        url.search ||
        url.hash ||
        token.length < 48 ||
        !expectedIssuer
      )
        throw new Error();
    } catch {
      throw new ServiceUnavailableException('Central access is not configured');
    }
    if (!subject || issuer !== expectedIssuer)
      throw new UnauthorizedException('Invalid central identity');
    let response: Response;
    try {
      response = await this.request(new URL('/api/service/taskosaur/access', url), {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(5000),
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ issuer, subject }),
      });
    } catch {
      throw new ServiceUnavailableException('Central access is temporarily unavailable');
    }
    if (response.status === 403)
      throw new UnauthorizedException('Access to this platform was removed');
    if (!response.ok)
      throw new ServiceUnavailableException('Central access is temporarily unavailable');
    let result: { allowed?: boolean; localAccountId?: string; version?: number };
    try {
      result = await response.json();
    } catch {
      throw new ServiceUnavailableException('Invalid central access response');
    }
    if (
      result.allowed !== true ||
      typeof result.localAccountId !== 'string' ||
      !/^[a-f0-9-]{36}$/i.test(result.localAccountId) ||
      !Number.isSafeInteger(result.version) ||
      result.version! < 1
    ) {
      throw new UnauthorizedException('Invalid central access response');
    }
    return { localAccountId: result.localAccountId.toLowerCase(), version: result.version! };
  }

  async validate(binding: CentralBinding, localId: string) {
    if (!this.enabled) return;
    if (!binding.hubIssuer || !binding.hubSubject || !Number.isSafeInteger(binding.hubVersion))
      throw new UnauthorizedException('Use the central sign-in');
    const access = await this.check(binding.hubIssuer, binding.hubSubject);
    if (access.localAccountId !== localId.toLowerCase() || access.version !== binding.hubVersion)
      throw new UnauthorizedException('Central session expired. Sign in again.');
  }
}
