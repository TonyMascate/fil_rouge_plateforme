import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { User } from '@app/users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import * as argon2 from 'argon2';

jest.mock('argon2');

const mockUserRepository = {
  findOne: jest.fn(),
};

const mockRefreshTokenRepository = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  delete: jest.fn(),
};

const mockJwtService = {
  signAsync: jest.fn(),
  verifyAsync: jest.fn(),
};

const mockConfigService = {
  getOrThrow: jest.fn(),
  get: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: getRepositoryToken(RefreshToken), useValue: mockRefreshTokenRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('retourne le user sans mot de passe si les credentials sont valides', async () => {
      const storedUser = { id: '1', email: 'test@test.com', password: 'hashed', role: 'user', firstName: 'Jean', lastName: 'Dupont' };
      mockUserRepository.findOne.mockResolvedValue(storedUser);
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser({ email: 'test@test.com', password: 'plain' });

      expect(result).not.toHaveProperty('password');
      expect(result?.email).toBe('test@test.com');
    });

    it("retourne null si l'utilisateur n'existe pas", async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.validateUser({ email: 'inconnu@test.com', password: 'plain' });

      expect(result).toBeNull();
    });

    it('retourne null si le mot de passe est incorrect', async () => {
      const storedUser = { id: '1', email: 'test@test.com', password: 'hashed', role: 'user', firstName: 'Jean', lastName: 'Dupont' };
      mockUserRepository.findOne.mockResolvedValue(storedUser);
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser({ email: 'test@test.com', password: 'mauvais' });

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('génère les tokens et sauvegarde le refresh token', async () => {
      const user = { id: '1', email: 'test@test.com', role: 'user', firstName: 'Jean', lastName: 'Dupont' } as unknown as User;
      mockConfigService.getOrThrow.mockReturnValue('secret');
      mockJwtService.signAsync.mockResolvedValue('token-value');
      (argon2.hash as jest.Mock).mockResolvedValue('hashed_refresh');
      mockRefreshTokenRepository.create.mockReturnValue({ id: 'uuid', tokenHash: 'hashed_refresh' });
      mockRefreshTokenRepository.save.mockResolvedValue({});

      const result = await service.login(user);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockRefreshTokenRepository.save).toHaveBeenCalled();
    });
  });

  describe('refreshTokens', () => {
    it('retourne de nouveaux tokens si le refresh token est valide', async () => {
      const storedToken = {
        id: 'token-id',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 10_000),
        tokenHash: 'hash',
        user: { id: '1', role: 'user', email: 'test@test.com', firstName: 'Jean', lastName: 'Dupont' },
      };
      mockJwtService.verifyAsync.mockResolvedValue({ tokenId: 'token-id' });
      mockRefreshTokenRepository.findOne.mockResolvedValue(storedToken);
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      (argon2.hash as jest.Mock).mockResolvedValue('new_hash');
      mockConfigService.getOrThrow.mockReturnValue('secret');
      mockJwtService.signAsync.mockResolvedValue('new-token');
      mockRefreshTokenRepository.delete.mockResolvedValue({});
      mockRefreshTokenRepository.save.mockResolvedValue({});

      const result = await service.refreshTokens('valid-refresh-token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('lève UnauthorizedException si le hash du token ne correspond pas', async () => {
      const storedToken = {
        id: 'token-id',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 10_000),
        tokenHash: 'hash',
        user: { id: '1', role: 'user', email: 'test@test.com', firstName: 'Jean', lastName: 'Dupont' },
      };
      mockJwtService.verifyAsync.mockResolvedValue({ tokenId: 'token-id' });
      mockRefreshTokenRepository.findOne.mockResolvedValue(storedToken);
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await expect(service.refreshTokens('bad-token')).rejects.toThrow(UnauthorizedException);
    });

    it('lève UnauthorizedException si le token est révoqué', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({ tokenId: 'abc' });
      mockRefreshTokenRepository.findOne.mockResolvedValue({
        id: 'abc',
        isRevoked: true,
        expiresAt: new Date(Date.now() + 10_000),
        tokenHash: 'hash',
        user: {},
      });

      await expect(service.refreshTokens('revoked-token')).rejects.toThrow(UnauthorizedException);
    });

    it('lève UnauthorizedException si le token est expiré', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({ tokenId: 'abc' });
      mockRefreshTokenRepository.findOne.mockResolvedValue({
        id: 'abc',
        isRevoked: false,
        expiresAt: new Date(Date.now() - 10_000),
        tokenHash: 'hash',
        user: {},
      });

      await expect(service.refreshTokens('expired-token')).rejects.toThrow(UnauthorizedException);
    });
  });
});
