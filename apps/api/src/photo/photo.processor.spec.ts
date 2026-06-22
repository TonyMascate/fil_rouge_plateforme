import { Test, TestingModule } from '@nestjs/testing';
import { PhotoProcessor } from './photo.processor';
import { PhotoRepository } from './repositories/photo.repository';
import { AwsService } from '@app/aws/aws.service';
import { RedisService } from '@app/redis/redis.service';
import { PhotoStatus } from '@repo/shared';

jest.mock('sharp', () => jest.fn());

const mockColorFork = {
  resize: jest.fn().mockReturnThis(),
  removeAlpha: jest.fn().mockReturnThis(),
  raw: jest.fn().mockReturnThis(),
  toBuffer: jest.fn(),
};

const mockUploadTransform = {
  resize: jest.fn().mockReturnThis(),
  webp: jest.fn().mockReturnThis(),
  pipe: jest.fn(),
};

const mockBase = {
  clone: jest.fn(),
  pipe: jest.fn(),
};

const mockPhotoRepo = {
  update: jest.fn(),
};

const mockAwsService = {
  downloadStream: jest.fn(),
  uploadStream: jest.fn(),
  deleteObject: jest.fn(),
  headObject: jest.fn(),
};

const mockRedisService = {
  del: jest.fn().mockResolvedValue(1),
};

const fakeJob = {
  id: 'job-1',
  data: { photoId: 'photo-uuid', rawKey: 'raw/photo.jpg', userId: 'user-uuid' },
} as any;

describe('PhotoProcessor', () => {
  let processor: PhotoProcessor;

  beforeEach(async () => {
    jest.resetAllMocks();

    // Re-setup des chaînes de méthodes Sharp
    mockColorFork.resize.mockReturnThis();
    mockColorFork.removeAlpha.mockReturnThis();
    mockColorFork.raw.mockReturnThis();
    mockColorFork.toBuffer.mockResolvedValue(
      // 3 pixels : rouge, vert, bleu → couvre les 3 chemins de teinte
      Buffer.from([255, 0, 0, 0, 255, 0, 0, 0, 255]),
    );

    mockUploadTransform.resize.mockReturnThis();
    mockUploadTransform.webp.mockReturnThis();

    mockBase.clone
      .mockReturnValueOnce(mockColorFork)
      .mockReturnValueOnce(mockUploadTransform);

    (require('sharp') as jest.Mock).mockReturnValue(mockBase);

    mockAwsService.downloadStream.mockResolvedValue({ pipe: jest.fn() });
    mockAwsService.uploadStream.mockResolvedValue({});
    mockAwsService.deleteObject.mockResolvedValue({});
    mockAwsService.headObject.mockResolvedValue({ ContentLength: 500_000 });
    mockPhotoRepo.update.mockResolvedValue({});
    mockRedisService.del.mockResolvedValue(1);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PhotoProcessor,
        { provide: PhotoRepository, useValue: mockPhotoRepo },
        { provide: AwsService, useValue: mockAwsService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    processor = module.get<PhotoProcessor>(PhotoProcessor);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('process()', () => {
    it('optimise la photo, extrait la palette et met à jour le statut COMPLETED', async () => {
      await processor.process(fakeJob);

      expect(mockPhotoRepo.update).toHaveBeenCalledWith('photo-uuid', { status: PhotoStatus.PROCESSING });
      expect(mockAwsService.downloadStream).toHaveBeenCalledWith('raw/photo.jpg');
      expect(mockAwsService.uploadStream).toHaveBeenCalled();
      expect(mockAwsService.deleteObject).toHaveBeenCalledWith('raw/photo.jpg');

      const completedUpdate = mockPhotoRepo.update.mock.calls.find(
        ([, payload]) => payload.status === PhotoStatus.COMPLETED,
      );
      expect(completedUpdate).toBeDefined();
      const payload = completedUpdate![1];
      expect(payload.dominantColor).toMatch(/^#[0-9a-f]{6}$/);
      expect(Array.isArray(payload.palette)).toBe(true);
      expect(Array.isArray(payload.colorCells)).toBe(true);
      // Le cache atlas de l'utilisateur est invalidé.
      expect(mockRedisService.del).toHaveBeenCalledWith('colors:atlas:user-uuid');
    });

    it('calcule la couleur dominante depuis des pixels gris (fallback niveaux de gris)', async () => {
      mockBase.clone
        .mockReset()
        .mockReturnValueOnce(mockColorFork)
        .mockReturnValueOnce(mockUploadTransform);
      // 1 pixel gris → saturation = 0 → chemin grayscalePixels
      mockColorFork.toBuffer.mockResolvedValue(Buffer.from([128, 128, 128]));

      await processor.process(fakeJob);

      expect(mockPhotoRepo.update).toHaveBeenCalledWith(
        'photo-uuid',
        expect.objectContaining({ status: PhotoStatus.COMPLETED }),
      );
    });

    it('calcule la couleur dominante via le fallback total (pixels trop sombres)', async () => {
      mockBase.clone
        .mockReset()
        .mockReturnValueOnce(mockColorFork)
        .mockReturnValueOnce(mockUploadTransform);
      // Pixel très sombre : lightness < 0.08 → ignoré → fallback total sur tous les pixels
      mockColorFork.toBuffer.mockResolvedValue(Buffer.from([1, 1, 1]));

      await processor.process(fakeJob);

      expect(mockPhotoRepo.update).toHaveBeenCalledWith(
        'photo-uuid',
        expect.objectContaining({ status: PhotoStatus.COMPLETED }),
      );
    });

    it('calcule la saturation via le chemin lightness > 0.5', async () => {
      mockBase.clone
        .mockReset()
        .mockReturnValueOnce(mockColorFork)
        .mockReturnValueOnce(mockUploadTransform);
      // Pixel clair coloré : lightness > 0.5 avec saturation élevée
      mockColorFork.toBuffer.mockResolvedValue(Buffer.from([240, 150, 100]));

      await processor.process(fakeJob);

      expect(mockPhotoRepo.update).toHaveBeenCalledWith(
        'photo-uuid',
        expect.objectContaining({ status: PhotoStatus.COMPLETED }),
      );
    });

    it('met dominantColor à null si colorBuf est null (toBuffer a rejeté)', async () => {
      mockBase.clone
        .mockReset()
        .mockReturnValueOnce(mockColorFork)
        .mockReturnValueOnce(mockUploadTransform);
      mockColorFork.toBuffer.mockRejectedValue(new Error('sharp error'));

      await processor.process(fakeJob);

      expect(mockPhotoRepo.update).toHaveBeenCalledWith(
        'photo-uuid',
        expect.objectContaining({ dominantColor: null }),
      );
    });

    it('met dominantColor à null si colorBuf fait moins de 3 octets', async () => {
      mockBase.clone
        .mockReset()
        .mockReturnValueOnce(mockColorFork)
        .mockReturnValueOnce(mockUploadTransform);
      mockColorFork.toBuffer.mockResolvedValue(Buffer.from([255, 0])); // 2 octets = < 1 pixel

      await processor.process(fakeJob);

      expect(mockPhotoRepo.update).toHaveBeenCalledWith(
        'photo-uuid',
        expect.objectContaining({ dominantColor: null }),
      );
    });

    it('met fileSizeBytes à null si headObject ne retourne pas de ContentLength', async () => {
      mockBase.clone
        .mockReset()
        .mockReturnValueOnce(mockColorFork)
        .mockReturnValueOnce(mockUploadTransform);
      mockAwsService.headObject.mockResolvedValue({});

      await processor.process(fakeJob);

      expect(mockPhotoRepo.update).toHaveBeenCalledWith(
        'photo-uuid',
        expect.objectContaining({ fileSizeBytes: null }),
      );
    });
  });

  describe('onFailed()', () => {
    it('met le statut à FAILED et supprime le fichier raw S3', async () => {
      await processor.onFailed(fakeJob, new Error('Timeout'));

      expect(mockPhotoRepo.update).toHaveBeenCalledWith('photo-uuid', { status: PhotoStatus.FAILED });
      expect(mockAwsService.deleteObject).toHaveBeenCalledWith('raw/photo.jpg');
    });

    it('absorbe silencieusement l\'erreur si deleteObject échoue', async () => {
      mockAwsService.deleteObject.mockRejectedValue(new Error('S3 unavailable'));

      await expect(processor.onFailed(fakeJob, new Error('Job failed'))).resolves.not.toThrow();
      expect(mockPhotoRepo.update).toHaveBeenCalledWith('photo-uuid', { status: PhotoStatus.FAILED });
    });
  });
});
