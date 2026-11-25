import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../prisma/prisma.service';
import { SettingsService } from '../../settings/settings.service';
import { OidcService } from './oidc.service';

describe('OIDC central account binding', () => {
  const issuer = 'https://identity.example.invalid/realms/iqualitys';
  const id = '12345678-1234-4234-8234-123456789012';
  afterEach(() => jest.restoreAllMocks());

  function fixture() {
    const account = {
      id,
      email: 'existing@example.invalid',
      firstName: 'Existing',
      lastName: 'User',
      role: 'MEMBER',
      status: 'ACTIVE',
      deletedAt: null,
      username: 'existing',
      avatar: null,
    };
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(account),
        update: jest.fn().mockResolvedValue(account),
        create: jest.fn(),
      },
    };
    const jwt = { sign: jest.fn().mockReturnValue('fixture-jwt') };
    const config = new ConfigService({
      CENTRAL_ACCESS_REQUIRED: 'true',
      CENTRAL_PORTAL_ORIGIN: 'https://access.example.invalid',
      CENTRAL_PORTAL_SERVICE_TOKEN: 'x'.repeat(64),
      CENTRAL_OIDC_ISSUER: issuer,
    });
    const service = new OidcService(
      prisma as unknown as PrismaService,
      {} as SettingsService,
      jwt as unknown as JwtService,
      config,
    );
    const claims: Record<string, unknown> = {
      iss: issuer,
      sub: 'fixture-subject',
      email: 'different@example.invalid',
      email_verified: true,
    };
    const client = {
      authorizationUrl: jest.fn().mockReturnValue(issuer + '/authorize'),
      callback: jest.fn().mockResolvedValue({ claims: () => claims }),
    };
    jest
      .spyOn(service as unknown as { getClient(): Promise<typeof client> }, 'getClient')
      .mockResolvedValue(client);
    jest
      .spyOn(service, 'getOidcConfig')
      .mockResolvedValue({
        enabled: true,
        providerName: 'iqualitys',
        issuerUrl: issuer,
        clientId: 'fixture-client',
        clientSecret: 'fixture-secret',
        redirectUri: 'https://projects.example.invalid/api/auth/oidc/callback',
      });
    const request = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ allowed: true, localAccountId: id, version: 4 }), {
          status: 200,
        }),
      );
    return { service, prisma, jwt, claims, client, request };
  }

  it('uses the explicit local account and keeps its role, without email linking or auto-registration', async () => {
    const f = fixture(),
      attempt = await f.service.getAuthorizationUrl();
    await f.service.handleCallback('fixture-code', attempt.state, attempt.state, attempt.nonce);
    expect(f.prisma.user.findUnique).toHaveBeenCalledWith({ where: { id } });
    expect(f.prisma.user.create).not.toHaveBeenCalled();
    expect(f.jwt.sign.mock.calls[0][0]).toMatchObject({
      sub: id,
      role: 'MEMBER',
      hubIssuer: issuer,
      hubSubject: 'fixture-subject',
      hubVersion: 4,
    });
    expect(f.prisma.user.update.mock.calls[0][0].data).not.toHaveProperty('role');
    expect(f.client.authorizationUrl.mock.calls[0][0]).toMatchObject({
      code_challenge_method: 'S256',
    });
    expect(f.client.callback.mock.calls[0][2]).toHaveProperty('code_verifier');
  });
  it('rejects an unverified email before mapping an existing account', async () => {
    const f = fixture();
    f.claims.email_verified = false;
    const attempt = await f.service.getAuthorizationUrl();
    await expect(
      f.service.handleCallback('code', attempt.state, attempt.state, attempt.nonce),
    ).rejects.toThrow('Verified');
    expect(f.prisma.user.findUnique).not.toHaveBeenCalled();
  });
  it('rejects a replayed authorization attempt', async () => {
    const f = fixture(),
      attempt = await f.service.getAuthorizationUrl();
    await f.service.handleCallback('code', attempt.state, attempt.state, attempt.nonce);
    await expect(
      f.service.handleCallback('code', attempt.state, attempt.state, attempt.nonce),
    ).rejects.toThrow('state');
    expect(f.client.callback).toHaveBeenCalledTimes(1);
  });
  it('never accepts a disabled local account through SSO', async () => {
    const f = fixture();
    f.prisma.user.findUnique.mockResolvedValue({ status: 'INACTIVE' });
    const attempt = await f.service.getAuthorizationUrl();
    await expect(
      f.service.handleCallback('code', attempt.state, attempt.state, attempt.nonce),
    ).rejects.toThrow('not active');
    expect(f.jwt.sign).not.toHaveBeenCalled();
  });
  it('exchanges a server-held result only once', () => {
    const f = fixture(),
      value = { access_token: 'fixture-access' };
    const ticket = f.service.createExchange(value);
    expect(ticket).not.toContain('fixture-access');
    expect(f.service.consumeExchange(ticket)).toEqual(value);
    expect(() => f.service.consumeExchange(ticket)).toThrow('expired');
  });
});
