import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bullmq';
import { PhotoService } from './photo.service';
import { PhotoRepository } from './repositories/photo.repository';
import { AwsService } from '@app/aws/aws.service';
import { PhotoStatus } from '@repo/shared';
import { ApiException } from '@app/common/api.exception';

const mockPhotoRepository = {
  storageUsedByUser: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  findAndCount: jest.fn(),
  delete: jest.fn(),
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

describe('PhotoService', () => {
  let service: PhotoService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConfigService.get.mockReturnValue(String(500 * 1024 * 1024));
    mockAwsService.getSignedImageUrl.mockReturnValue('https://cdn.example.com/photo.jpg');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PhotoService,
        { provide: PhotoRepository, useValue: mockPhotoRepository },
        { provide: getQueueToken('image-queue'), useValue: mockImageQueue },
        { provide: AwsService, useValue: mockAwsService },
        { provide: ConfigService, useValue: mockConfigService },
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

  describe('listByColors', () => {
    it('retourne un tableau vide si aucune photo n\'a de couleur dominante', async () => {
      mockPhotoRepository.find.mockResolvedValue([{ id: '1', dominantColor: null, s3Key: 'a.jpg' }]);

      const result = await service.listByColors('user-uuid');

      expect(result).toEqual([]);
    });

    it('groupe les photos par clusters de couleurs (chemin normal avec k-means)', async () => {
      const photos = Array.from({ length: 9 }, (_, index) => ({
        id: String(index),
        dominantColor: index % 3 === 0 ? '#ff0000' : index % 3 === 1 ? '#00ff00' : '#0000ff',
        s3Key: `photo-${index}.jpg`,
        userId: 'user-uuid',
        status: PhotoStatus.COMPLETED,
      }));
      mockPhotoRepository.find.mockResolvedValue(photos);

      const result = await service.listByColors('user-uuid');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('family');
      expect(result[0]).toHaveProperty('count');
    });

    it('retourne directement les photos si le nombre est inférieur aux clusters (retour anticipé)', async () => {
      const photos = [
        { id: '1', dominantColor: '#ff0000', s3Key: 'a.jpg', userId: 'user-uuid', status: PhotoStatus.COMPLETED },
        { id: '2', dominantColor: '#00ff00', s3Key: 'b.jpg', userId: 'user-uuid', status: PhotoStatus.COMPLETED },
      ];
      mockPhotoRepository.find.mockResolvedValue(photos);

      const result = await service.listByColors('user-uuid');

      expect(Array.isArray(result)).toBe(true);
    });
  });
});
