import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AlbumService } from './album.service';
import { Album } from './entities/album.entity';
import { AlbumPhotoRepository } from './repositories/album-photo.repository';
import { AlbumMemberRepository } from './repositories/album-member.repository';
import { AwsService } from '@app/aws/aws.service';
import { Photo } from '@app/photo/entities/photo.entity';
import { User } from '@app/users/entities/user.entity';
import { ApiException } from '@app/common/api.exception';

const mockAlbumRepo = {
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
};

const mockAlbumPhotoRepo = {
  count: jest.fn(),
  getCoversS3KeysForAlbums: jest.fn(),
  countByAlbumIds: jest.fn(),
  findPhotosPage: jest.fn(),
  findPhotoIds: jest.fn(),
  insert: jest.fn(),
  delete: jest.fn(),
  findOne: jest.fn(),
};

const mockAlbumMemberRepo = {
  find: jest.fn(),
  getMembersForAlbums: jest.fn(),
  findOne: jest.fn(),
  insert: jest.fn(),
  delete: jest.fn(),
};

const mockPhotoRepo = {
  find: jest.fn(),
};

const mockUserRepo = {
  findOne: jest.fn(),
};

const mockAwsService = {
  getSignedImageUrl: jest.fn().mockReturnValue('https://cdn.example.com/photo.jpg'),
};

const OWNER_ID = 'owner-uuid';
const ALBUM_ID = 'album-uuid';

const baseAlbum = {
  id: ALBUM_ID,
  name: 'Mon album',
  userId: OWNER_ID,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('AlbumService', () => {
  let service: AlbumService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockAwsService.getSignedImageUrl.mockReturnValue('https://cdn.example.com/photo.jpg');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlbumService,
        { provide: getRepositoryToken(Album), useValue: mockAlbumRepo },
        { provide: AlbumPhotoRepository, useValue: mockAlbumPhotoRepo },
        { provide: AlbumMemberRepository, useValue: mockAlbumMemberRepo },
        { provide: getRepositoryToken(Photo), useValue: mockPhotoRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: AwsService, useValue: mockAwsService },
      ],
    }).compile();

    service = module.get<AlbumService>(AlbumService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('crée un album et retourne le DTO', async () => {
      mockAlbumRepo.save.mockResolvedValue(baseAlbum);

      const result = await service.create({ name: 'Mon album' }, OWNER_ID);

      expect(mockAlbumRepo.save).toHaveBeenCalledWith({ name: 'Mon album', userId: OWNER_ID });
      expect(result.name).toBe('Mon album');
      expect(result.isOwner).toBe(true);
      expect(result.photoCount).toBe(0);
    });
  });

  describe('findAllForUser', () => {
    it('retourne un tableau vide si aucun album', async () => {
      mockAlbumRepo.find.mockResolvedValue([]);
      mockAlbumMemberRepo.find.mockResolvedValue([]);

      const result = await service.findAllForUser(OWNER_ID);

      expect(result).toEqual([]);
    });

    it('retourne les albums propres et partagés avec membres', async () => {
      const sharedAlbum = {
        id: 'shared-uuid',
        name: 'Partagé',
        userId: 'other-user',
        createdAt: new Date('2025-12-01'),
        updatedAt: new Date('2025-12-01'),
      };
      mockAlbumRepo.find.mockResolvedValue([baseAlbum]);
      mockAlbumMemberRepo.find.mockResolvedValue([{ album: sharedAlbum, userId: OWNER_ID, createdAt: new Date() }]);
      mockAlbumPhotoRepo.countByAlbumIds.mockResolvedValue(
        new Map([
          [ALBUM_ID, 3],
          ['shared-uuid', 1],
        ]),
      );
      mockAlbumPhotoRepo.getCoversS3KeysForAlbums.mockResolvedValue(
        new Map([
          [ALBUM_ID, ['opt/a.jpg']],
          ['shared-uuid', []],
        ]),
      );
      mockAlbumMemberRepo.getMembersForAlbums.mockResolvedValue([
        { albumId: ALBUM_ID, id: 'member-uuid', email: 'member@test.com', firstName: 'Alice', lastName: 'B' },
      ]);

      const result = await service.findAllForUser(OWNER_ID);

      expect(result).toHaveLength(2);
      expect(result.some((album) => album.isOwner)).toBe(true);
      expect(result.some((album) => !album.isOwner)).toBe(true);
    });
  });

  describe('findOne', () => {
    it("retourne l'album si l'utilisateur y a accès", async () => {
      mockAlbumRepo.findOne.mockResolvedValue(baseAlbum);
      mockAlbumPhotoRepo.count.mockResolvedValue(5);
      mockAlbumPhotoRepo.getCoversS3KeysForAlbums.mockResolvedValue(new Map([[ALBUM_ID, ['opt/cover.jpg']]]));
      mockAlbumMemberRepo.getMembersForAlbums.mockResolvedValue([]);

      const result = await service.findOne(ALBUM_ID, OWNER_ID);

      expect(result.id).toBe(ALBUM_ID);
      expect(result.photoCount).toBe(5);
    });

    it("retourne l'album pour un membre (non-propriétaire)", async () => {
      const memberAlbum = { ...baseAlbum, userId: 'other-owner' };
      mockAlbumRepo.findOne.mockResolvedValue(memberAlbum);
      mockAlbumMemberRepo.findOne.mockResolvedValue({ albumId: ALBUM_ID, userId: OWNER_ID });
      mockAlbumPhotoRepo.count.mockResolvedValue(2);
      mockAlbumPhotoRepo.getCoversS3KeysForAlbums.mockResolvedValue(new Map([[ALBUM_ID, []]]));

      const result = await service.findOne(ALBUM_ID, OWNER_ID);

      expect(result.isOwner).toBe(false);
    });

    it('lève ApiException si le user est un non-membre', async () => {
      mockAlbumRepo.findOne.mockResolvedValue(baseAlbum);
      mockAlbumMemberRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(ALBUM_ID, 'stranger-uuid')).rejects.toThrow(ApiException);
    });

    it('lève ApiException si album introuvable', async () => {
      mockAlbumRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(ALBUM_ID, OWNER_ID)).rejects.toThrow(ApiException);
    });
  });

  describe('update', () => {
    it("renomme l'album", async () => {
      mockAlbumRepo.findOne.mockResolvedValue({ ...baseAlbum });
      mockAlbumRepo.save.mockImplementation((album: any) => Promise.resolve(album));
      mockAlbumPhotoRepo.count.mockResolvedValue(0);
      mockAlbumPhotoRepo.getCoversS3KeysForAlbums.mockResolvedValue(new Map());
      mockAlbumMemberRepo.getMembersForAlbums.mockResolvedValue([]);

      const result = await service.update(ALBUM_ID, { name: 'Nouveau nom' }, OWNER_ID);

      expect(result.name).toBe('Nouveau nom');
    });

    it("lève ApiException si le user n'est pas propriétaire", async () => {
      mockAlbumRepo.findOne.mockResolvedValue(baseAlbum);

      await expect(service.update(ALBUM_ID, { name: 'Test' }, 'other-uuid')).rejects.toThrow(ApiException);
    });
  });

  describe('remove', () => {
    it("supprime l'album", async () => {
      mockAlbumRepo.findOne.mockResolvedValue(baseAlbum);
      mockAlbumRepo.delete.mockResolvedValue({});

      await service.remove(ALBUM_ID, OWNER_ID);

      expect(mockAlbumRepo.delete).toHaveBeenCalledWith(ALBUM_ID);
    });
  });

  describe('getPhotos', () => {
    it("retourne les photos paginées de l'album", async () => {
      mockAlbumRepo.findOne.mockResolvedValue(baseAlbum);
      const photoRows = [
        { photo: { id: 'p1', s3Key: 'opt/a.jpg', originalName: 'a.jpg', createdAt: new Date(), shareToken: null } },
      ];
      mockAlbumPhotoRepo.findPhotosPage.mockResolvedValue([photoRows, 1]);

      const result = await service.getPhotos(ALBUM_ID, OWNER_ID, { page: 1, limit: 20 } as any);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('addPhotos', () => {
    it("ajoute des photos valides à l'album", async () => {
      mockAlbumRepo.findOne.mockResolvedValue(baseAlbum);
      mockAlbumPhotoRepo.count.mockResolvedValue(0);
      mockPhotoRepo.find.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
      mockAlbumPhotoRepo.insert.mockResolvedValue({});

      await service.addPhotos(ALBUM_ID, ['p1', 'p2'], OWNER_ID);

      expect(mockAlbumPhotoRepo.insert).toHaveBeenCalled();
    });

    it("lève ApiException si une photo est déjà dans l'album", async () => {
      mockAlbumRepo.findOne.mockResolvedValue(baseAlbum);
      mockAlbumPhotoRepo.count.mockResolvedValue(1);

      await expect(service.addPhotos(ALBUM_ID, ['p1'], OWNER_ID)).rejects.toThrow(ApiException);
    });
  });

  describe('removePhoto', () => {
    it("retire une photo de l'album", async () => {
      mockAlbumRepo.findOne.mockResolvedValue(baseAlbum);
      mockAlbumPhotoRepo.delete.mockResolvedValue({});

      await service.removePhoto(ALBUM_ID, 'p1', OWNER_ID);

      expect(mockAlbumPhotoRepo.delete).toHaveBeenCalledWith({ albumId: ALBUM_ID, photoId: 'p1' });
    });
  });

  describe('getMembers', () => {
    it('retourne la liste des membres', async () => {
      mockAlbumRepo.findOne.mockResolvedValue(baseAlbum);
      mockAlbumMemberRepo.getMembersForAlbums.mockResolvedValue([
        { albumId: ALBUM_ID, id: 'member-uuid', email: 'member@test.com', firstName: 'Alice', lastName: 'B' },
      ]);

      const result = await service.getMembers(ALBUM_ID, OWNER_ID);

      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('member@test.com');
    });
  });

  describe('addMember', () => {
    it("ajoute un membre à l'album", async () => {
      mockAlbumRepo.findOne.mockResolvedValue(baseAlbum);
      mockUserRepo.findOne.mockResolvedValue({
        id: 'member-uuid',
        email: 'member@test.com',
        firstName: 'Alice',
        lastName: 'B',
      });
      mockAlbumMemberRepo.findOne.mockResolvedValue(null);
      mockAlbumMemberRepo.insert.mockResolvedValue({});

      const result = await service.addMember(ALBUM_ID, 'member@test.com', OWNER_ID);

      expect(result.email).toBe('member@test.com');
      expect(mockAlbumMemberRepo.insert).toHaveBeenCalled();
    });

    it("lève ApiException si l'utilisateur est introuvable", async () => {
      mockAlbumRepo.findOne.mockResolvedValue(baseAlbum);
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(service.addMember(ALBUM_ID, 'unknown@test.com', OWNER_ID)).rejects.toThrow(ApiException);
    });

    it("lève ApiException si le propriétaire essaie de se partager l'album", async () => {
      mockAlbumRepo.findOne.mockResolvedValue(baseAlbum);
      mockUserRepo.findOne.mockResolvedValue({
        id: OWNER_ID,
        email: 'owner@test.com',
        firstName: 'Jean',
        lastName: 'D',
      });

      await expect(service.addMember(ALBUM_ID, 'owner@test.com', OWNER_ID)).rejects.toThrow(ApiException);
    });

    it('ne reinsère pas si le membre existe déjà', async () => {
      mockAlbumRepo.findOne.mockResolvedValue(baseAlbum);
      mockUserRepo.findOne.mockResolvedValue({
        id: 'member-uuid',
        email: 'member@test.com',
        firstName: 'Alice',
        lastName: 'B',
      });
      mockAlbumMemberRepo.findOne.mockResolvedValue({ albumId: ALBUM_ID, userId: 'member-uuid' });

      await service.addMember(ALBUM_ID, 'member@test.com', OWNER_ID);

      expect(mockAlbumMemberRepo.insert).not.toHaveBeenCalled();
    });
  });

  describe('removeMember', () => {
    it("retire un membre de l'album", async () => {
      mockAlbumRepo.findOne.mockResolvedValue(baseAlbum);
      mockAlbumMemberRepo.delete.mockResolvedValue({});

      await service.removeMember(ALBUM_ID, 'member-uuid', OWNER_ID);

      expect(mockAlbumMemberRepo.delete).toHaveBeenCalledWith({ albumId: ALBUM_ID, userId: 'member-uuid' });
    });
  });

  describe('getPhotoIds', () => {
    it("retourne les IDs des photos de l'album", async () => {
      mockAlbumRepo.findOne.mockResolvedValue(baseAlbum);
      mockAlbumPhotoRepo.findPhotoIds.mockResolvedValue(['p1', 'p2']);

      const result = await service.getPhotoIds(ALBUM_ID, OWNER_ID);

      expect(result).toEqual(['p1', 'p2']);
    });
  });
});
