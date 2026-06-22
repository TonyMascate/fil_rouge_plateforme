import { Test, TestingModule } from '@nestjs/testing';
import { PhotoController } from './photo.controller';
import { PhotoService } from './photo.service';
import { AwsService } from '@app/aws/aws.service';
import { RedisService } from '@app/redis/redis.service';
import { PhotoStatus } from '@repo/shared';

const mockPhotoService = {
  getQuotaForUser: jest.fn(),
  registerUpload: jest.fn(),
  getStatus: jest.fn(),
  listForUser: jest.fn(),
  deletePhoto: jest.fn(),
  sharePhoto: jest.fn(),
  unsharePhoto: jest.fn(),
  getColorAtlas: jest.fn(),
  listByCell: jest.fn(),
};

const mockAwsService = {
  createMultipartUpload: jest.fn(),
  signPart: jest.fn(),
  listParts: jest.fn(),
  completeMultipartUpload: jest.fn(),
  abortMultipartUpload: jest.fn(),
  deleteObject: jest.fn(),
};

const mockRedisService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

const currentUser = { userId: 'user-uuid' };

describe('PhotoController', () => {
  let controller: PhotoController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PhotoController],
      providers: [
        { provide: PhotoService, useValue: mockPhotoService },
        { provide: AwsService, useValue: mockAwsService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    controller = module.get<PhotoController>(PhotoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getQuota', () => {
    it('retourne le quota de stockage de l\'utilisateur courant', async () => {
      const quota = { usedBytes: 1024, maxBytes: 500 * 1024 * 1024 };
      mockPhotoService.getQuotaForUser.mockResolvedValue(quota);

      const result = await controller.getQuota(currentUser);

      expect(mockPhotoService.getQuotaForUser).toHaveBeenCalledWith('user-uuid');
      expect(result).toEqual(quota);
    });
  });

  describe('getStatus', () => {
    it('retourne le statut d\'une photo', async () => {
      const status = { id: 'photo-uuid', status: PhotoStatus.COMPLETED, url: 'https://cdn.example.com/photo.jpg' };
      mockPhotoService.getStatus.mockResolvedValue(status);

      const result = await controller.getStatus('photo-uuid', currentUser);

      expect(mockPhotoService.getStatus).toHaveBeenCalledWith('photo-uuid', 'user-uuid');
      expect(result).toEqual(status);
    });
  });

  describe('list', () => {
    it('retourne la liste paginée des photos', async () => {
      const photoList = { items: [], page: 1, limit: 20, total: 0, totalPages: 0 };
      mockPhotoService.listForUser.mockResolvedValue(photoList);

      const result = await controller.list({ page: 1, limit: 20, order: 'desc' } as any, currentUser);

      expect(mockPhotoService.listForUser).toHaveBeenCalledWith('user-uuid', { page: 1, limit: 20, order: 'desc' });
      expect(result).toEqual(photoList);
    });
  });

  describe('getColorAtlas', () => {
    it('retourne l\'atlas couleur de l\'utilisateur', async () => {
      const atlas = [{ cellId: 'c-0-1', kind: 'chromatic', hueIndex: 0, lightIndex: 1, hex: '#e0382b', label: 'rouge moyen', count: 3 }];
      mockPhotoService.getColorAtlas.mockResolvedValue(atlas);

      const result = await controller.getColorAtlas(currentUser);

      expect(mockPhotoService.getColorAtlas).toHaveBeenCalledWith('user-uuid', undefined);
      expect(result).toEqual(atlas);
    });

    it('transmet l\'albumId quand il est fourni', async () => {
      mockPhotoService.getColorAtlas.mockResolvedValue([]);

      await controller.getColorAtlas(currentUser, 'album-uuid');

      expect(mockPhotoService.getColorAtlas).toHaveBeenCalledWith('user-uuid', 'album-uuid');
    });
  });

  describe('getColorCellPhotos', () => {
    it('retourne les photos d\'une cellule valide', async () => {
      const response = { cellId: 'c-8-2', items: [], page: 1, limit: 20, total: 0, totalPages: 0 };
      mockPhotoService.listByCell.mockResolvedValue(response);

      const result = await controller.getColorCellPhotos('c-8-2', { page: 1, limit: 20, order: 'desc' } as any, currentUser);

      expect(mockPhotoService.listByCell).toHaveBeenCalledWith('user-uuid', 'c-8-2', { page: 1, limit: 20, order: 'desc' }, undefined);
      expect(result).toEqual(response);
    });

    it('transmet l\'albumId à listByCell quand il est fourni', async () => {
      mockPhotoService.listByCell.mockResolvedValue({ cellId: 'c-8-2', items: [], page: 1, limit: 20, total: 0, totalPages: 0 });

      await controller.getColorCellPhotos('c-8-2', { page: 1, limit: 20, order: 'desc' } as any, currentUser, 'album-uuid');

      expect(mockPhotoService.listByCell).toHaveBeenCalledWith('user-uuid', 'c-8-2', { page: 1, limit: 20, order: 'desc' }, 'album-uuid');
    });

    it('lève une erreur 400 si le cellId est inconnu', () => {
      expect(() =>
        controller.getColorCellPhotos('pas-une-cellule', { page: 1, limit: 20, order: 'desc' } as any, currentUser),
      ).toThrow();
      expect(mockPhotoService.listByCell).not.toHaveBeenCalled();
    });
  });

  describe('deletePhoto', () => {
    it('supprime la photo via photoService', async () => {
      mockPhotoService.deletePhoto.mockResolvedValue(undefined);

      await controller.deletePhoto('photo-uuid', currentUser);

      expect(mockPhotoService.deletePhoto).toHaveBeenCalledWith('photo-uuid', 'user-uuid');
    });
  });

  describe('sharePhoto', () => {
    it('retourne le share token', async () => {
      mockPhotoService.sharePhoto.mockResolvedValue({ shareToken: 'token-abc' });

      const result = await controller.sharePhoto('photo-uuid', currentUser);

      expect(mockPhotoService.sharePhoto).toHaveBeenCalledWith('photo-uuid', 'user-uuid');
      expect(result).toEqual({ shareToken: 'token-abc' });
    });
  });

  describe('unsharePhoto', () => {
    it('révoque le partage de la photo', async () => {
      mockPhotoService.unsharePhoto.mockResolvedValue(undefined);

      await controller.unsharePhoto('photo-uuid', currentUser);

      expect(mockPhotoService.unsharePhoto).toHaveBeenCalledWith('photo-uuid', 'user-uuid');
    });
  });

  describe('completeMultipart', () => {
    it('assemble les parts et enregistre la photo', async () => {
      mockRedisService.get.mockResolvedValue('user-uuid');
      mockAwsService.completeMultipartUpload.mockResolvedValue({});
      mockRedisService.del.mockResolvedValue(1);
      mockPhotoService.registerUpload.mockResolvedValue({ photoId: 'p1', status: 'PENDING' });

      const dto = { key: 'raw/photo.jpg', uploadId: 'upload-123', parts: [], originalName: 'photo.jpg' };
      const result = await controller.completeMultipart(dto as any, currentUser);

      expect(mockAwsService.completeMultipartUpload).toHaveBeenCalled();
      expect(result).toHaveProperty('photoId');
    });

    it('supprime l\'objet S3 et relance l\'erreur si registerUpload échoue', async () => {
      mockRedisService.get.mockResolvedValue('user-uuid');
      mockAwsService.completeMultipartUpload.mockResolvedValue({});
      mockRedisService.del.mockResolvedValue(1);
      mockPhotoService.registerUpload.mockRejectedValue(new Error('DB error'));
      mockAwsService.deleteObject.mockResolvedValue({});

      const dto = { key: 'raw/photo.jpg', uploadId: 'upload-123', parts: [], originalName: 'photo.jpg' };

      await expect(controller.completeMultipart(dto as any, currentUser)).rejects.toThrow();
      expect(mockAwsService.deleteObject).toHaveBeenCalledWith('raw/photo.jpg');
    });
  });

  describe('assertUploadOwner — accès refusé', () => {
    it('lève ApiException si l\'uploadId n\'appartient pas à l\'utilisateur', async () => {
      mockRedisService.get.mockResolvedValue('other-user-uuid');

      await expect(
        controller.signPart({ key: 'raw/photo.jpg', uploadId: 'upload-123', partNumber: 1 } as any, currentUser),
      ).rejects.toThrow();
    });
  });

  describe('createMultipart', () => {
    it('lève une erreur si le quota est dépassé', async () => {
      mockPhotoService.getQuotaForUser.mockResolvedValue({
        usedBytes: 490 * 1024 * 1024,
        maxBytes: 500 * 1024 * 1024,
      });

      await expect(
        controller.createMultipart({ fileSize: 20 * 1024 * 1024, contentType: 'image/jpeg' } as any, currentUser),
      ).rejects.toThrow();
    });

    it('initialise un upload multipart si le quota le permet', async () => {
      mockPhotoService.getQuotaForUser.mockResolvedValue({
        usedBytes: 10 * 1024 * 1024,
        maxBytes: 500 * 1024 * 1024,
      });
      mockAwsService.createMultipartUpload.mockResolvedValue({ uploadId: 'upload-123', key: 'raw/photo.jpg' });
      mockRedisService.set.mockResolvedValue('OK');

      const result = await controller.createMultipart(
        { fileSize: 5 * 1024 * 1024, contentType: 'image/jpeg' } as any,
        currentUser,
      );

      expect(mockAwsService.createMultipartUpload).toHaveBeenCalledWith('image/jpeg');
      expect(mockRedisService.set).toHaveBeenCalled();
      expect(result).toHaveProperty('uploadId', 'upload-123');
    });
  });

  describe('signPart', () => {
    it('retourne une URL signée pour la part', async () => {
      mockRedisService.get.mockResolvedValue('user-uuid');
      mockAwsService.signPart.mockResolvedValue('https://s3.example.com/signed-part');

      const result = await controller.signPart(
        { key: 'raw/photo.jpg', uploadId: 'upload-123', partNumber: 1 } as any,
        currentUser,
      );

      expect(result).toEqual({ url: 'https://s3.example.com/signed-part' });
    });
  });

  describe('listParts', () => {
    it('retourne les parts d\'un upload en cours', async () => {
      mockRedisService.get.mockResolvedValue('user-uuid');
      mockAwsService.listParts.mockResolvedValue([{ PartNumber: 1, ETag: 'etag', Size: 1024 }]);

      const result = await controller.listParts(
        { key: 'raw/photo.jpg', uploadId: 'upload-123' } as any,
        currentUser,
      );

      expect(mockAwsService.listParts).toHaveBeenCalledWith('raw/photo.jpg', 'upload-123');
      expect(result).toHaveLength(1);
    });
  });

  describe('abortMultipart', () => {
    it('annule l\'upload et supprime la clé Redis', async () => {
      mockRedisService.get.mockResolvedValue('user-uuid');
      mockAwsService.abortMultipartUpload.mockResolvedValue({});
      mockRedisService.del.mockResolvedValue(1);

      await controller.abortMultipart(
        { key: 'raw/photo.jpg', uploadId: 'upload-123' } as any,
        currentUser,
      );

      expect(mockAwsService.abortMultipartUpload).toHaveBeenCalledWith('raw/photo.jpg', 'upload-123');
      expect(mockRedisService.del).toHaveBeenCalled();
    });
  });
});
