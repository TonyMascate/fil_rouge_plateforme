import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import * as argon2 from 'argon2';

jest.mock('argon2');

const mockUsersRepository = {
  findOneBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: getRepositoryToken(User), useValue: mockUsersRepository }],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('crée un utilisateur avec le mot de passe hashé', async () => {
      const createDto = { email: 'new@test.com', password: 'plain', firstName: 'Jean', lastName: 'Dupont' };
      mockUsersRepository.findOneBy.mockResolvedValue(null);
      (argon2.hash as jest.Mock).mockResolvedValue('hashed');
      const savedUser = { id: '1', ...createDto, password: 'hashed' };
      mockUsersRepository.create.mockReturnValue(savedUser);
      mockUsersRepository.save.mockResolvedValue(savedUser);

      const result = await service.create(createDto as any);

      expect(argon2.hash).toHaveBeenCalledWith('plain');
      expect(mockUsersRepository.save).toHaveBeenCalled();
      expect(result.email).toBe('new@test.com');
    });

    it("lève ConflictException si l'email est déjà utilisé", async () => {
      mockUsersRepository.findOneBy.mockResolvedValue({ id: '1', email: 'exists@test.com' });

      await expect(service.create({ email: 'exists@test.com' } as any)).rejects.toThrow(ConflictException);
    });
  });

  describe('getProfile', () => {
    it("retourne le profil de l'utilisateur correspondant", async () => {
      const userId = 'user-uuid';
      const mockUser = { id: userId, email: 'user@test.com' };
      mockUsersRepository.findOneBy.mockResolvedValue(mockUser);

      const result = await service.getProfile(userId);

      expect(mockUsersRepository.findOneBy).toHaveBeenCalledWith({ id: userId });
      expect(result).toEqual(mockUser);
    });
  });

  describe('findAll', () => {
    it('retourne tous les utilisateurs', async () => {
      const users = [{ id: '1' }, { id: '2' }];
      mockUsersRepository.find.mockResolvedValue(users);

      const result = await service.findAll();

      expect(result).toEqual(users);
    });
  });
});
