import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';

jest.mock('./auth.service', () => ({ AuthService: class {} }));
jest.mock('./services/setup.service', () => ({ SetupService: class {} }));

describe('central portal public configuration', () => {
  const config = (origin: string, enabled = 'true') => {
    const controller = Object.create(AuthController.prototype) as AuthController;
    Object.assign(controller, {
      configService: new ConfigService({
        CENTRAL_ACCESS_REQUIRED: enabled,
        CENTRAL_PORTAL_ORIGIN: origin,
      }),
    });
    return controller.centralConfig();
  };
  it.each(['https://acceso.example.invalid', 'http://127.0.0.1:10031'])(
    'publishes an enabled secure or loopback portal: %s',
    (origin) => expect(config(origin)).toEqual({ enabled: true, portalUrl: origin + '/' }),
  );
  it.each([
    'http://acceso.example.invalid',
    'https://user:password@example.invalid',
    'https://example.invalid/path',
    'https://example.invalid/?redirect=other',
    'javascript:alert(1)',
  ])('does not publish an unsafe portal: %s', (origin) => {
    expect(config(origin)).toEqual({ enabled: false });
  });
  it('does not expose the portal while central mode is off', () => {
    expect(config('http://127.0.0.1:10031', 'false')).toEqual({ enabled: false });
  });
});
