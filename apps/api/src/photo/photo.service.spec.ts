import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bullmq';
import { PhotoService } from './photo.service';
import { PhotoRepository } from './repositories/photo.repository';
import { AwsService } from '@app/aws/aws.service';
import { PhotoStatus } from '@repo/shared';
import { ApiException } from '@app/common/api.exception';
import { RedisService } from '@app/redis/redis.service';
import { AlbumPhotoRepository } from '@app/album/repositories/album-photo.repository';

const mockPhotoRepository = {
  storageUsedByUser: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  findAndCount: jest.fn(),
  delete: jest.fn(),
  countByColorCell: jest.fn(),
  findByColorCellPage: jest.fn(),
};

const mockImageQueue = {
  add: jest.fn(),
};

const mockAwsService = {
  headObject: jest.fn(),
  getSignedImageUrl: jest.fn().mockReturnValue('https://cdn.example.com/photo.jpg'),
  deleteObject: jest.fn(),
};

const mockConfigService = {
  get: jest.fn().mockReturnValue(String(500 * 1024 * 1024)),
  getOrThrow: jest.fn(),
};

const mockRedisService = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
};

const mockAlbumPhotoRepository = {
  findPhotosByCellPage: jest.fn(),
};

describe('PhotoService', () => {
  let service: PhotoService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConfigService.get.mockReturnValue(String(500 * 1024 * 1024));
    mockAwsService.getSignedImageUrl.mockReturnValue('https://cdn.example.com/photo.jpg');
    mockRedisService.get.mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PhotoService,
        { provide: PhotoRepository, useValue: mockPhotoRepository },
        { provide: getQueueToken('image-queue'), useValue: mockImageQueue },
        { provide: AwsService, useValue: mockAwsService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: AlbumPhotoRepository, useValue: mockAlbumPhotoRepository },
      ],
    }).compile();

    service = module.get<PhotoService>(PhotoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getQuotaForUser', () => {
    it('retourne les octets utilisés et le quota maximum', async () => {
      mockPhotoRepository.storageUsedByUser.mockResolvedValue(1024 * 1024);

      const result = await service.getQuotaForUser('user-uuid');

      expect(result.usedBytes).toBe(1024 * 1024);
      expect(result.maxBytes).toBeGreaterThan(0);
    });
  });

  describe('registerUpload', () => {
    it('sauvegarde la photo et ajoute un job d\'optimisation', async () => {
      mockAwsService.headObject.mockResolvedValue({ ContentLength: 2048 });
      const savedPhoto = { id: 'photo-uuid', status: PhotoStatus.PENDING };
      mockPhotoRepository.save.mockResolvedValue(savedPhoto);
      mockImageQueue.add.mockResolvedValue({});

      const result = await service.registerUpload({ key: 'raw/photo.jpg', originalName: 'photo.jpg' }, 'user-uuid');

      expect(mockAwsService.headObject).toHaveBeenCalledWith('raw/photo.jpg');
      expect(mockPhotoRepository.save).toHaveBeenCalled();
      expect(mockImageQueue.add).toHaveBeenCalledWith('optimize', expect.any(Object), expect.any(Object));
      expect(result.status).toBe(PhotoStatus.PENDING);
    });

    it('lève ApiException si le fichier est introuvable sur S3', async () => {
      mockAwsService.headObject.mockRejectedValue(new Error('Not found'));

      await expect(
        service.registerUpload({ key: 'raw/missing.jpg', originalName: 'missing.jpg' }, 'user-uuid'),
      ).rejects.toThrow(ApiException);
    });
  });

  describe('registerUpload', () => {
    it('sauvegarde avec fileSizeBytes null si ContentLength est absent', async () => {
      mockAwsService.headObject.mockResolvedValue({});
      const savedPhoto = { id: 'photo-uuid', status: PhotoStatus.PENDING };
      mockPhotoRepository.save.mockResolvedValue(savedPhoto);
      mockImageQueue.add.mockResolvedValue({});

      const result = await service.registerUpload({ key: 'raw/photo.jpg', originalName: 'photo.jpg' }, 'user-uuid');

      expect(result.status).toBe(PhotoStatus.PENDING);
    });
  });

  describe('getStatus', () => {
    it('retourne le statut PENDING avec url null', async () => {
      const photo = { id: 'photo-uuid', userId: 'user-uuid', status: PhotoStatus.PENDING, s3Key: 'raw/photo.jpg' };
      mockPhotoRepository.findOne.mockResolvedValue(photo);

      const result = await service.getStatus('photo-uuid', 'user-uuid');

      expect(result.status).toBe(PhotoStatus.PENDING);
      expect(result.url).toBeNull();
    });

    it('retourne le statut et l\'URL quand la photo est COMPLETED', async () => {
      const photo = { id: 'photo-uuid', userId: 'user-uuid', status: PhotoStatus.COMPLETED, s3Key: 'opt/photo.jpg' };
      mockPhotoRepository.findOne.mockResolvedValue(photo);

      const result = await service.getStatus('photo-uuid', 'user-uuid');

      expect(result.status).toBe(PhotoStatus.COMPLETED);
      expect(result.url).not.toBeNull();
    });

    it("lève ApiException si la photo appartient à un autre utilisateur", async () => {
      const photo = { id: 'photo-uuid', userId: 'other-user', status: PhotoStatus.COMPLETED, s3Key: 'opt/photo.jpg' };
      mockPhotoRepository.findOne.mockResolvedValue(photo);

      await expect(service.getStatus('photo-uuid', 'user-uuid')).rejects.toThrow(ApiException);
    });

    it('lève ApiException si la photo est introuvable', async () => {
      mockPhotoRepository.findOne.mockResolvedValue(null);

      await expect(service.getStatus('photo-uuid', 'user-uuid')).rejects.toThrow(ApiException);
    });
  });

  describe('deletePhoto', () => {
    it('supprime la photo en base et l\'objet S3', async () => {
      const photo = { id: 'photo-uuid', userId: 'user-uuid', s3Key: 'opt/photo.jpg' };
      mockPhotoRepository.findOne.mockResolvedValue(photo);
      mockPhotoRepository.delete.mockResolvedValue({});
      mockAwsService.deleteObject.mockResolvedValue({});

      await service.deletePhoto('photo-uuid', 'user-uuid');

      expect(mockPhotoRepository.delete).toHaveBeenCalledWith('photo-uuid');
      expect(mockAwsService.deleteObject).toHaveBeenCalledWith('opt/photo.jpg');
    });
  });

  describe('sharePhoto', () => {
    it('génère et sauvegarde un share token si aucun n\'existe', async () => {
      const photo = { id: 'photo-uuid', userId: 'user-uuid', shareToken: null };
      mockPhotoRepository.findOne.mockResolvedValue(photo);
      mockPhotoRepository.save.mockImplementation((updated: any) => Promise.resolve(updated));

      const result = await service.sharePhoto('photo-uuid', 'user-uuid');

      expect(result.shareToken).toBeTruthy();
      expect(mockPhotoRepository.save).toHaveBeenCalled();
    });

    it('retourne le token existant sans sauvegarder si un token est déjà présent', async () => {
      const photo = { id: 'photo-uuid', userId: 'user-uuid', shareToken: 'existing-token' };
      mockPhotoRepository.findOne.mockResolvedValue(photo);

      const result = await service.sharePhoto('photo-uuid', 'user-uuid');

      expect(result.shareToken).toBe('existing-token');
      expect(mockPhotoRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('unsharePhoto', () => {
    it('efface le share token si la photo en a un', async () => {
      const photo = { id: 'photo-uuid', userId: 'user-uuid', shareToken: 'token' };
      mockPhotoRepository.findOne.mockResolvedValue(photo);
      mockPhotoRepository.save.mockResolvedValue({});

      await service.unsharePhoto('photo-uuid', 'user-uuid');

      expect(photo.shareToken).toBeNull();
      expect(mockPhotoRepository.save).toHaveBeenCalled();
    });

    it('ne sauvegarde pas si aucun share token n\'existe', async () => {
      const photo = { id: 'photo-uuid', userId: 'user-uuid', shareToken: null };
      mockPhotoRepository.findOne.mockResolvedValue(photo);

      await service.unsharePhoto('photo-uuid', 'user-uuid');

      expect(mockPhotoRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('getPublicByToken', () => {
    it('retourne les données publiques de la photo si le token est valide', async () => {
      const photo = {
        id: 'photo-uuid',
        shareToken: 'public-token',
        status: PhotoStatus.COMPLETED,
        s3Key: 'opt/photo.jpg',
        originalName: 'photo.jpg',
        createdAt: new Date(),
      };
      mockPhotoRepository.findOne.mockResolvedValue(photo);

      const result = await service.getPublicByToken('public-token');

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('originalName', 'photo.jpg');
    });

    it('lève ApiException si le token est invalide', async () => {
      mockPhotoRepository.findOne.mockResolvedValue(null);

      await expect(service.getPublicByToken('invalid-token')).rejects.toThrow(ApiException);
    });
  });

  describe('listForUser', () => {
    it('retourne une liste paginée de photos', async () => {
      const photos = [
        { id: '1', s3Key: 'a.jpg', originalName: 'a.jpg', createdAt: new Date(), shareToken: null },
      ];
      mockPhotoRepository.findAndCount.mockResolvedValue([photos, 1]);

      const result = await service.listForUser('user-uuid', { page: 1, limit: 20, order: 'desc' } as any);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('getColorAtlas', () => {
    it('renvoie la grille complète d\'atlas avec les counts par cellule (cache miss)', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPhotoRepository.countByColorCell.mockResolvedValue([
        { cellId: 'c-0-1', count: 3 },
        { cellId: 'n-4', count: 5 },
      ]);

      const result = await service.getColorAtlas('user-uuid');

      // Grille fixe : toutes les cellules sont présentes (53), counts injectés.
      expect(result.length).toBeGreaterThan(40);
      expect(result.find((cell) => cell.cellId === 'c-0-1')?.count).toBe(3);
      expect(result.find((cell) => cell.cellId === 'n-4')?.count).toBe(5);
      // Une cellule sans photo est à 0.
      expect(result.find((cell) => cell.cellId === 'c-5-0')?.count).toBe(0);
      // Le résultat est mis en cache.
      expect(mockRedisService.set).toHaveBeenCalled();
    });

    it('sert le cache sans requêter la base si présent', async () => {
      const cached = [{ cellId: 'c-0-0', kind: 'chromatic', hueIndex: 0, lightIndex: 0, hex: '#000', label: 'x', count: 2 }];
      mockRedisService.get.mockResolvedValue(JSON.stringify(cached));

      const result = await service.getColorAtlas('user-uuid');

      expect(result).toEqual(cached);
      expect(mockPhotoRepository.countByColorCell).not.toHaveBeenCalled();
    });

    it('filtré par album : ne lit pas le cache et passe l\'albumId au repository', async () => {
      mockPhotoRepository.countByColorCell.mockResolvedValue([{ cellId: 'c-4-1', count: 2 }]);

      await service.getColorAtlas('user-uuid', 'album-uuid');

      // Pas de cache quand filtré par album.
      expect(mockRedisService.get).not.toHaveBeenCalled();
      expect(mockRedisService.set).not.toHaveBeenCalled();
      // L'albumId est délégué au repository.
      expect(mockPhotoRepository.countByColorCell).toHaveBeenCalledWith('user-uuid', 'album-uuid');
    });
  });

  describe('listByCell', () => {
    it('renvoie les photos d\'une cellule, paginées', async () => {
      const photos = [
        { id: '1', s3Key: 'a.jpg', originalName: 'a.jpg', createdAt: new Date(), shareToken: null },
      ];
      mockPhotoRepository.findByColorCellPage.mockResolvedValue([photos, 1]);

      const result = await service.listByCell('user-uuid', 'c-8-2', { page: 1, limit: 20, order: 'desc' } as any);

      expect(mockPhotoRepository.findByColorCellPage).toHaveBeenCalledWith('user-uuid', 'c-8-2', { page: 1, limit: 20, order: 'desc' });
      expect(result.cellId).toBe('c-8-2');
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toHaveProperty('url');
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
      // Sans album : on requête directement la table photos, pas le chemin album.
      expect(mockAlbumPhotoRepository.findPhotosByCellPage).not.toHaveBeenCalled();
    });

    it('passe par le chemin album (findPhotosByCellPage) quand un albumId est fourni', async () => {
      mockAlbumPhotoRepository.findPhotosByCellPage.mockResolvedValue([
        [{ photo: { id: '9', s3Key: 'z.jpg', originalName: 'z.jpg', createdAt: new Date(), shareToken: null } }],
        1,
      ]);

      const result = await service.listByCell('user-uuid', 'c-8-2', { page: 1, limit: 20, order: 'desc' } as any, 'album-uuid');

      expect(mockAlbumPhotoRepository.findPhotosByCellPage).toHaveBeenCalledWith(
        'album-uuid',
        'user-uuid',
        'c-8-2',
        { page: 1, limit: 20, order: 'desc' },
      );
      // La requête directe sur photos n'est PAS utilisée dans ce cas.
      expect(mockPhotoRepository.findByColorCellPage).not.toHaveBeenCalled();
      expect(result.cellId).toBe('c-8-2');
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toHaveProperty('url');
      expect(result.total).toBe(1);
    });
  });
});
