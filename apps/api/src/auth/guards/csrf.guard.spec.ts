import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CsrfGuard } from './csrf.guard';

const buildContext = (overrides: {
  skipCsrf?: boolean;
  method?: string;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
}) => {
  const { skipCsrf = false, method = 'POST', headers = {}, cookies = {} } = overrides;
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ method, headers, cookies }),
    }),
    _skipCsrf: skipCsrf,
  };
};

describe('CsrfGuard', () => {
  let guard: CsrfGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CsrfGuard, Reflector],
    }).compile();

    guard = module.get<CsrfGuard>(CsrfGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('autorise si le décorateur @SkipCsrf est présent', () => {
    const context = buildContext({ skipCsrf: true });
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

    expect(guard.canActivate(context as any)).toBe(true);
  });

  it('autorise les requêtes GET', () => {
    const context = buildContext({ method: 'GET' });
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

    expect(guard.canActivate(context as any)).toBe(true);
  });

  it('autorise les requêtes OPTIONS', () => {
    const context = buildContext({ method: 'OPTIONS' });
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

    expect(guard.canActivate(context as any)).toBe(true);
  });

  it('autorise si les tokens CSRF correspondent', () => {
    const context = buildContext({
      method: 'POST',
      headers: { 'x-xsrf-token': 'valid-token' },
      cookies: { 'XSRF-TOKEN': 'valid-token' },
    });
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

    expect(guard.canActivate(context as any)).toBe(true);
  });

  it('lève UnauthorizedException si le cookie CSRF est absent', () => {
    const context = buildContext({
      method: 'POST',
      headers: { 'x-xsrf-token': 'token' },
      cookies: {},
    });
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

    expect(() => guard.canActivate(context as any)).toThrow(UnauthorizedException);
  });

  it('lève UnauthorizedException si les tokens ne correspondent pas', () => {
    const context = buildContext({
      method: 'DELETE',
      headers: { 'x-xsrf-token': 'token-a' },
      cookies: { 'XSRF-TOKEN': 'token-b' },
    });
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

    expect(() => guard.canActivate(context as any)).toThrow(UnauthorizedException);
  });
});
