import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { UsersService } from '@app/users/users.service';

jest.mock('@nestjs/passport', () => ({
  PassportStrategy: jest.fn(() => class {}),
}));

jest.mock('passport-jwt', () => ({
  ExtractJwt: { fromExtractors: jest.fn().mockReturnValue(() => null) },
  Strategy: jest.fn(),
}));

const mockUsersService = {
  getProfile: jest.fn(),
};

const mockConfigService = {
  getOrThrow: jest.fn().mockReturnValue('test-jwt-secret'),
};

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConfigService.getOrThrow.mockReturnValue('test-jwt-secret');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: UsersService, useValue: mockUsersService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('retourne les infos du user si le token est valide', async () => {
      const user = { id: 'user-uuid', role: 'user', email: 'test@test.com' };
      mockUsersService.getProfile.mockResolvedValue(user);

      const result = await strategy.validate({ sub: 'user-uuid' });

      expect(mockUsersService.getProfile).toHaveBeenCalledWith('user-uuid');
      expect(result).toEqual({ userId: 'user-uuid', role: 'user', email: 'test@test.com' });
    });

    it('lève UnauthorizedException si le user est introuvable', async () => {
      mockUsersService.getProfile.mockResolvedValue(null);

      await expect(strategy.validate({ sub: 'unknown-uuid' })).rejects.toThrow(UnauthorizedException);
    });
  });
});
