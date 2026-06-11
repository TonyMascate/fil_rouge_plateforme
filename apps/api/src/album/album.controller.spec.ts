import { Test, TestingModule } from '@nestjs/testing';
import { AlbumController } from './album.controller';
import { AlbumService } from './album.service';

const mockAlbumService = {
  findAllForUser: jest.fn(),
  create: jest.fn(),
  findOne: jest.fn(),
  getPhotoIds: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  getPhotos: jest.fn(),
  addPhotos: jest.fn(),
  removePhoto: jest.fn(),
  getMembers: jest.fn(),
  addMember: jest.fn(),
  removeMember: jest.fn(),
};

const currentUser = { userId: 'user-uuid' };

describe('AlbumController', () => {
  let controller: AlbumController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlbumController],
      providers: [{ provide: AlbumService, useValue: mockAlbumService }],
    }).compile();

    controller = module.get<AlbumController>(AlbumController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('retourne les albums de l\'utilisateur', async () => {
      const albums = [{ id: 'a1', name: 'Album 1' }];
      mockAlbumService.findAllForUser.mockResolvedValue(albums);

      const result = await controller.findAll(currentUser);

      expect(mockAlbumService.findAllForUser).toHaveBeenCalledWith('user-uuid');
      expect(result).toEqual(albums);
    });
  });

  describe('create', () => {
    it('crée un album', async () => {
      const dto = { name: 'Nouveau' };
      const album = { id: 'a1', name: 'Nouveau', isOwner: true };
      mockAlbumService.create.mockResolvedValue(album);

      const result = await controller.create(dto as any, currentUser);

      expect(mockAlbumService.create).toHaveBeenCalledWith(dto, 'user-uuid');
      expect(result).toEqual(album);
    });
  });

  describe('findOne', () => {
    it('retourne un album par son id', async () => {
      const album = { id: 'album-uuid', name: 'Album' };
      mockAlbumService.findOne.mockResolvedValue(album);

      const result = await controller.findOne('album-uuid', currentUser);

      expect(mockAlbumService.findOne).toHaveBeenCalledWith('album-uuid', 'user-uuid');
      expect(result).toEqual(album);
    });
  });

  describe('getPhotoIds', () => {
    it('retourne les IDs des photos', async () => {
      mockAlbumService.getPhotoIds.mockResolvedValue(['p1', 'p2']);

      const result = await controller.getPhotoIds('album-uuid', currentUser);

      expect(result).toEqual(['p1', 'p2']);
    });
  });

  describe('update', () => {
    it('renomme l\'album', async () => {
      const updated = { id: 'album-uuid', name: 'Nouveau nom' };
      mockAlbumService.update.mockResolvedValue(updated);

      const result = await controller.update('album-uuid', { name: 'Nouveau nom' } as any, currentUser);

      expect(mockAlbumService.update).toHaveBeenCalledWith('album-uuid', { name: 'Nouveau nom' }, 'user-uuid');
      expect(result).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('supprime l\'album', async () => {
      mockAlbumService.remove.mockResolvedValue(undefined);

      await controller.remove('album-uuid', currentUser);

      expect(mockAlbumService.remove).toHaveBeenCalledWith('album-uuid', 'user-uuid');
    });
  });

  describe('getPhotos', () => {
    it('retourne les photos paginées', async () => {
      const photoList = { items: [], page: 1, limit: 20, total: 0, totalPages: 0 };
      mockAlbumService.getPhotos.mockResolvedValue(photoList);

      const result = await controller.getPhotos('album-uuid', { page: 1, limit: 20 } as any, currentUser);

      expect(mockAlbumService.getPhotos).toHaveBeenCalledWith('album-uuid', 'user-uuid', { page: 1, limit: 20 });
      expect(result).toEqual(photoList);
    });
  });

  describe('addPhotos', () => {
    it('ajoute des photos à l\'album', async () => {
      mockAlbumService.addPhotos.mockResolvedValue(undefined);

      await controller.addPhotos('album-uuid', { photoIds: ['p1', 'p2'] } as any, currentUser);

      expect(mockAlbumService.addPhotos).toHaveBeenCalledWith('album-uuid', ['p1', 'p2'], 'user-uuid');
    });
  });

  describe('removePhoto', () => {
    it('retire une photo de l\'album', async () => {
      mockAlbumService.removePhoto.mockResolvedValue(undefined);

      await controller.removePhoto('album-uuid', 'photo-uuid', currentUser);

      expect(mockAlbumService.removePhoto).toHaveBeenCalledWith('album-uuid', 'photo-uuid', 'user-uuid');
    });
  });

  describe('getMembers', () => {
    it('retourne les membres de l\'album', async () => {
      const members = [{ id: 'm1', email: 'member@test.com' }];
      mockAlbumService.getMembers.mockResolvedValue(members);

      const result = await controller.getMembers('album-uuid', currentUser);

      expect(result).toEqual(members);
    });
  });

  describe('addMember', () => {
    it('ajoute un membre', async () => {
      const member = { id: 'm1', email: 'member@test.com' };
      mockAlbumService.addMember.mockResolvedValue(member);

      const result = await controller.addMember('album-uuid', { email: 'member@test.com' } as any, currentUser);

      expect(mockAlbumService.addMember).toHaveBeenCalledWith('album-uuid', 'member@test.com', 'user-uuid');
      expect(result).toEqual(member);
    });
  });

  describe('removeMember', () => {
    it('retire un membre', async () => {
      mockAlbumService.removeMember.mockResolvedValue(undefined);

      await controller.removeMember('album-uuid', 'member-uuid', currentUser);

      expect(mockAlbumService.removeMember).toHaveBeenCalledWith('album-uuid', 'member-uuid', 'user-uuid');
    });
  });
});
