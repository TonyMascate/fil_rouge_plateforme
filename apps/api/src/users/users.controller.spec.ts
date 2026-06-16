import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

const mockUsersService = {
  getProfile: jest.fn(),
  findAll: jest.fn(),
};

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAdminData', () => {
    it('retourne le message réservé aux admins', () => {
      const result = controller.getAdminData();
      expect(result).toEqual({ message: 'Données réservées aux administrateurs' });
    });
  });

  describe('getProfile', () => {
    it('appelle usersService.getProfile avec le userId courant', async () => {
      const currentUser = { userId: 'user-uuid', role: 'user', email: 'user@test.com' };
      const profile = { id: 'user-uuid', email: 'user@test.com' };
      mockUsersService.getProfile.mockResolvedValue(profile);

      const result = await controller.getProfile(currentUser);

      expect(mockUsersService.getProfile).toHaveBeenCalledWith('user-uuid');
      expect(result).toEqual(profile);
    });
  });
});
