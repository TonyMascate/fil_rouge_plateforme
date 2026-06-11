import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { Role } from '@repo/shared';

const buildContext = (overrides: { requiredRoles?: Role[] | null; userRole?: string }) => {
  const { requiredRoles = null, userRole = 'user' } = overrides;
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ user: { role: userRole } }),
    }),
    _requiredRoles: requiredRoles,
  };
};

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RolesGuard, Reflector],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('autorise si aucun rôle requis n\'est défini', () => {
    const context = buildContext({ requiredRoles: null });
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);

    expect(guard.canActivate(context as any)).toBe(true);
  });

  it('autorise si l\'utilisateur possède le rôle requis', () => {
    const context = buildContext({ requiredRoles: [Role.ADMIN], userRole: Role.ADMIN });
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);

    expect(guard.canActivate(context as any)).toBe(true);
  });

  it('lève UnauthorizedException si le rôle est insuffisant', () => {
    const context = buildContext({ requiredRoles: [Role.ADMIN], userRole: Role.USER });
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);

    expect(() => guard.canActivate(context as any)).toThrow(UnauthorizedException);
  });
});
