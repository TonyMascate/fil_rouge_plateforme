import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersService } from '@app/users/users.service';

const mockAuthService = {
  validateUser: jest.fn(),
  login: jest.fn(),
  refreshTokens: jest.fn(),
};

const mockUsersService = {
  create: jest.fn(),
};

const mockConfigService = {
  get: jest.fn().mockReturnValue('test'),
  getOrThrow: jest.fn().mockReturnValue('15m'),
};

const mockResponse = {
  cookie: jest.fn(),
  clearCookie: jest.fn(),
};

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConfigService.get.mockReturnValue('test');
    mockConfigService.getOrThrow.mockReturnValue('15m');

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('crée un user et pose les cookies', async () => {
      const createUserDto = { email: 'test@test.com', password: 'Pass123', firstName: 'Jean', lastName: 'Dupont' };
      const createdUser = { id: '1', ...createUserDto };
      mockUsersService.create.mockResolvedValue(createdUser);
      mockAuthService.login.mockResolvedValue({ accessToken: 'access', refreshToken: 'refresh', tokenId: 'tid' });

      const result = await controller.register(createUserDto as any, mockResponse as any);

      expect(mockUsersService.create).toHaveBeenCalledWith(createUserDto);
      expect(mockResponse.cookie).toHaveBeenCalled();
      expect(result).toHaveProperty('user');
    });
  });

  describe('login', () => {
    it('pose les cookies si les credentials sont valides', async () => {
      const loginDto = { email: 'test@test.com', password: 'Pass123' };
      mockAuthService.validateUser.mockResolvedValue({ id: '1', email: 'test@test.com' });
      mockAuthService.login.mockResolvedValue({ accessToken: 'access', refreshToken: 'refresh', tokenId: 'tid' });

      const result = await controller.login(loginDto as any, mockResponse as any);

      expect(mockResponse.cookie).toHaveBeenCalled();
      expect(result).toHaveProperty('user');
    });

    it('lève une erreur si les credentials sont invalides', async () => {
      mockAuthService.validateUser.mockResolvedValue(null);

      await expect(
        controller.login({ email: 'bad@test.com', password: 'wrong' } as any, mockResponse as any),
      ).rejects.toThrow();
    });
  });

  describe('refresh', () => {
    it('lève UnauthorizedException si le cookie refresh_token est absent', async () => {
      const mockRequest = { cookies: {} };

      await expect(controller.refresh(mockRequest as any, mockResponse as any)).rejects.toThrow(UnauthorizedException);
    });

    it('renouvelle les cookies si le refresh token est valide', async () => {
      const mockRequest = { cookies: { refresh_token: 'valid-token' } };
      mockAuthService.refreshTokens.mockResolvedValue({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
        tokenId: 'tid',
      });

      const result = await controller.refresh(mockRequest as any, mockResponse as any);

      expect(mockResponse.cookie).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Refreshed' });
    });
  });

  describe('logout', () => {
    it('efface les 3 cookies', async () => {
      const result = await controller.logout(mockResponse as any);

      expect(mockResponse.clearCookie).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ message: 'Logged out' });
    });
  });
});
