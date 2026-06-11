import { Test, TestingModule } from '@nestjs/testing';
import { PublicPhotoController } from './public-photo.controller';
import { PhotoService } from './photo.service';

const mockPhotoService = {
  getPublicByToken: jest.fn(),
};

describe('PublicPhotoController', () => {
  let controller: PublicPhotoController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicPhotoController],
      providers: [{ provide: PhotoService, useValue: mockPhotoService }],
    }).compile();

    controller = module.get<PublicPhotoController>(PublicPhotoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getPublic', () => {
    it('retourne les données publiques de la photo', async () => {
      const photo = { url: 'https://cdn.example.com/photo.jpg', originalName: 'photo.jpg', createdAt: new Date() };
      mockPhotoService.getPublicByToken.mockResolvedValue(photo);

      const result = await controller.getPublic('share-token-abc');

      expect(mockPhotoService.getPublicByToken).toHaveBeenCalledWith('share-token-abc');
      expect(result).toEqual(photo);
    });
  });
});
