import { ConfigService } from '@nestjs/config';
import { CentralAccess } from './central-access';

describe('CentralAccess', () => {
  const id = '12345678-1234-4234-8234-123456789012';
  const issuer = 'https://identity.example.invalid/realms/iqualitys';
  const settings = {
    CENTRAL_ACCESS_REQUIRED: 'true',
    CENTRAL_PORTAL_ORIGIN: 'https://access.example.invalid',
    CENTRAL_PORTAL_SERVICE_TOKEN: 'x'.repeat(64),
    CENTRAL_OIDC_ISSUER: issuer,
  };
  const binding = { hubIssuer: issuer, hubSubject: 'fixture-subject', hubVersion: 7 };
  const response = (status: number, value: unknown) =>
    new Response(JSON.stringify(value), { status });

  it('does not change existing installations before explicit activation', async () => {
    const request = jest.fn();
    await new CentralAccess(new ConfigService({}), request).validate({}, id);
    expect(request).not.toHaveBeenCalled();
  });
  it('requires a centrally bound token, including tokens from existing sessions', async () => {
    const request = jest.fn();
    await expect(
      new CentralAccess(new ConfigService(settings), request).validate({}, id),
    ).rejects.toThrow('central sign-in');
    expect(request).not.toHaveBeenCalled();
  });
  it('checks the correct portal endpoint and preserves the local identity', async () => {
    const request = jest
      .fn()
      .mockResolvedValue(response(200, { allowed: true, localAccountId: id, version: 7 }));
    await new CentralAccess(new ConfigService(settings), request).validate(binding, id);
    expect(String(request.mock.calls[0][0])).toBe(
      'https://access.example.invalid/api/service/taskosaur/access',
    );
    expect(JSON.parse(request.mock.calls[0][1].body)).toEqual({
      issuer,
      subject: 'fixture-subject',
    });
  });
  it('rejects removed access even with a valid application token', async () => {
    const request = jest.fn().mockResolvedValue(response(403, {}));
    await expect(
      new CentralAccess(new ConfigService(settings), request).validate(binding, id),
    ).rejects.toThrow('removed');
  });
  it('rejects stale versions after logout or permission change', async () => {
    const request = jest
      .fn()
      .mockResolvedValue(response(200, { allowed: true, localAccountId: id, version: 8 }));
    await expect(
      new CentralAccess(new ConfigService(settings), request).validate(binding, id),
    ).rejects.toThrow('expired');
  });
  it('rejects a central mapping to another local account', async () => {
    const request = jest
      .fn()
      .mockResolvedValue(
        response(200, {
          allowed: true,
          localAccountId: '22222222-2222-4222-8222-222222222222',
          version: 7,
        }),
      );
    await expect(
      new CentralAccess(new ConfigService(settings), request).validate(binding, id),
    ).rejects.toThrow('expired');
  });
  it('fails closed when the central server is unavailable', async () => {
    const request = jest.fn().mockRejectedValue(new Error('offline'));
    await expect(
      new CentralAccess(new ConfigService(settings), request).validate(binding, id),
    ).rejects.toThrow('unavailable');
  });
  it('rejects another issuer before making a request', async () => {
    const request = jest.fn();
    await expect(
      new CentralAccess(new ConfigService(settings), request).validate(
        { ...binding, hubIssuer: 'https://other.invalid' },
        id,
      ),
    ).rejects.toThrow('identity');
    expect(request).not.toHaveBeenCalled();
  });
  it('does not send service credentials over remote HTTP', async () => {
    const request = jest.fn();
    await expect(
      new CentralAccess(
        new ConfigService({ ...settings, CENTRAL_PORTAL_ORIGIN: 'http://access.example.invalid' }),
        request,
      ).validate(binding, id),
    ).rejects.toThrow('configured');
    expect(request).not.toHaveBeenCalled();
  });
});
