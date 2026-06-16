import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AwsService } from './aws.service';

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({ UploadId: 'upload-123', Parts: [] }),
  })),
  HeadObjectCommand: jest.fn(),
  DeleteObjectCommand: jest.fn(),
  GetObjectCommand: jest.fn(),
  CreateMultipartUploadCommand: jest.fn(),
  UploadPartCommand: jest.fn(),
  ListPartsCommand: jest.fn(),
  CompleteMultipartUploadCommand: jest.fn(),
  AbortMultipartUploadCommand: jest.fn(),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://s3.example.com/signed'),
}));

jest.mock('@aws-sdk/cloudfront-signer', () => ({
  getSignedUrl: jest.fn().mockReturnValue('https://cdn.example.com/signed-url?Policy=xxx'),
}));

jest.mock('@aws-sdk/lib-storage', () => ({
  Upload: jest.fn().mockImplementation(() => ({
    done: jest.fn().mockResolvedValue({}),
  })),
}));

const FAKE_PRIVATE_KEY = Buffer.from('fake-private-key').toString('base64');

const mockConfigService = {
  getOrThrow: jest.fn((key: string) => {
    const config: Record<string, string> = {
      S3_BUCKET_NAME: 'test-bucket',
      CLOUDFRONT_DOMAIN: 'cdn.example.com',
      CLOUDFRONT_KEY_PAIR_ID: 'KEYPAIRID123',
      CLOUDFRONT_PRIVATE_KEY_BASE64: FAKE_PRIVATE_KEY,
      AWS_REGION: 'eu-west-1',
      AWS_ACCESS_KEY_ID: 'fake-access-key',
      AWS_SECRET_ACCESS_KEY: 'fake-secret-key',
    };
    return config[key] ?? 'default-value';
  }),
  get: jest.fn((key: string) => {
    const config: Record<string, string> = {
      CLOUDFRONT_SIGNED_URL_TTL_SECONDS: '3600',
    };
    return config[key];
  }),
};

describe('AwsService', () => {
  let service: AwsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConfigService.getOrThrow.mockImplementation((key: string) => {
      const config: Record<string, string> = {
        S3_BUCKET_NAME: 'test-bucket',
        CLOUDFRONT_DOMAIN: 'cdn.example.com',
        CLOUDFRONT_KEY_PAIR_ID: 'KEYPAIRID123',
        CLOUDFRONT_PRIVATE_KEY_BASE64: FAKE_PRIVATE_KEY,
        AWS_REGION: 'eu-west-1',
        AWS_ACCESS_KEY_ID: 'fake-access-key',
        AWS_SECRET_ACCESS_KEY: 'fake-secret-key',
      };
      return config[key] ?? 'default-value';
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AwsService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AwsService>(AwsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSignedImageUrl', () => {
    it('retourne une URL CloudFront signée', () => {
      const url = service.getSignedImageUrl('raw/photo.jpg');

      expect(typeof url).toBe('string');
      expect(url).toContain('https://');
    });
  });

  describe('createMultipartUpload', () => {
    it('retourne un uploadId et une clé S3 pour un type image/jpeg', async () => {
      const result = await service.createMultipartUpload('image/jpeg');

      expect(result).toHaveProperty('uploadId', 'upload-123');
      expect(result.key).toMatch(/^raw\/.+\.jpg$/);
    });

    it('retourne une clé avec l\'extension correcte selon le content-type', async () => {
      const resultPng = await service.createMultipartUpload('image/png');
      expect(resultPng.key).toMatch(/\.png$/);

      const resultWebp = await service.createMultipartUpload('image/webp');
      expect(resultWebp.key).toMatch(/\.webp$/);
    });
  });

  describe('headObject', () => {
    it('retourne les métadonnées de l\'objet S3', async () => {
      const result = await service.headObject('raw/photo.jpg');
      expect(result).toBeDefined();
    });
  });

  describe('deleteObject', () => {
    it('supprime l\'objet S3', async () => {
      const result = await service.deleteObject('raw/photo.jpg');
      expect(result).toBeDefined();
    });
  });

  describe('signPart', () => {
    it('retourne une URL signée pour la part', async () => {
      const url = await service.signPart('raw/photo.jpg', 'upload-123', 1);
      expect(typeof url).toBe('string');
      expect(url).toContain('https://');
    });
  });

  describe('completeMultipartUpload', () => {
    it('assemble les parts', async () => {
      const result = await service.completeMultipartUpload('raw/photo.jpg', 'upload-123', [
        { PartNumber: 1, ETag: 'etag-1' },
      ]);
      expect(result).toBeDefined();
    });
  });

  describe('abortMultipartUpload', () => {
    it('annule l\'upload', async () => {
      const result = await service.abortMultipartUpload('raw/photo.jpg', 'upload-123');
      expect(result).toBeDefined();
    });
  });

  describe('listParts', () => {
    it('retourne un tableau de parts', async () => {
      const result = await service.listParts('raw/photo.jpg', 'upload-123');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('createMultipartUpload — fallback extension', () => {
    it('retourne une clé avec extension .bin pour un content-type inconnu', async () => {
      const result = await service.createMultipartUpload('video/mp4');
      expect(result.key).toMatch(/\.bin$/);
    });
  });

  describe('createMultipartUpload — UploadId absent', () => {
    it('lève une erreur si S3 ne retourne pas d\'UploadId', async () => {
      const { S3Client } = require('@aws-sdk/client-s3');
      S3Client.mockImplementationOnce(() => ({
        send: jest.fn().mockResolvedValue({}),
      }));

      const freshModule = await Test.createTestingModule({
        providers: [AwsService, { provide: ConfigService, useValue: mockConfigService }],
      }).compile();
      const freshService = freshModule.get<AwsService>(AwsService);

      await expect(freshService.createMultipartUpload('image/jpeg')).rejects.toThrow('S3 did not return an UploadId');
    });
  });

  describe('listParts — Parts absent dans la réponse S3', () => {
    it('retourne un tableau vide si S3 ne renvoie pas de Parts', async () => {
      const { S3Client } = require('@aws-sdk/client-s3');
      S3Client.mockImplementationOnce(() => ({
        send: jest.fn().mockResolvedValue({}),
      }));

      const freshModule = await Test.createTestingModule({
        providers: [AwsService, { provide: ConfigService, useValue: mockConfigService }],
      }).compile();
      const freshService = freshModule.get<AwsService>(AwsService);

      const result = await freshService.listParts('raw/photo.jpg', 'upload-123');
      expect(result).toEqual([]);
    });
  });
});
