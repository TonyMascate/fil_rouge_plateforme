import { AlbumPhotoRepository } from './album-photo.repository';

const mockQueryBuilder = {
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  innerJoinAndSelect: jest.fn().mockReturnThis(),
  getRawMany: jest.fn(),
  getManyAndCount: jest.fn(),
};

const mockManager = {
  query: jest.fn(),
};

const mockDataSource = {
  createEntityManager: jest.fn().mockReturnValue(mockManager),
} as any;

describe('AlbumPhotoRepository', () => {
  let repo: AlbumPhotoRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQueryBuilder.getRawMany.mockResolvedValue([]);
    mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
    mockManager.query.mockResolvedValue([]);

    repo = new AlbumPhotoRepository(mockDataSource);
    jest.spyOn(repo, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
    jest.spyOn(repo, 'find').mockResolvedValue([]);
  });

  it('should be defined', () => {
    expect(repo).toBeDefined();
  });

  describe('getCoversS3KeysForAlbums', () => {
    it('retourne une Map vide si aucun albumId fourni', async () => {
      const result = await repo.getCoversS3KeysForAlbums([]);

      expect(result).toEqual(new Map());
      expect(mockManager.query).not.toHaveBeenCalled();
    });

    it('retourne une Map albumId → s3Keys depuis la BDD', async () => {
      mockManager.query.mockResolvedValue([
        { albumId: 'album-1', s3Key: 'opt/cover1.jpg' },
        { albumId: 'album-1', s3Key: 'opt/cover2.jpg' },
        { albumId: 'album-2', s3Key: 'opt/cover3.jpg' },
      ]);

      const result = await repo.getCoversS3KeysForAlbums(['album-1', 'album-2']);

      expect(result.get('album-1')).toEqual(['opt/cover1.jpg', 'opt/cover2.jpg']);
      expect(result.get('album-2')).toEqual(['opt/cover3.jpg']);
    });
  });

  describe('countByAlbumIds', () => {
    it('retourne une Map vide si aucun albumId fourni', async () => {
      const result = await repo.countByAlbumIds([]);

      expect(result).toEqual(new Map());
      expect(repo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('retourne une Map albumId → count', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([
        { albumId: 'album-1', count: '5' },
        { albumId: 'album-2', count: '3' },
      ]);

      const result = await repo.countByAlbumIds(['album-1', 'album-2']);

      expect(result.get('album-1')).toBe(5);
      expect(result.get('album-2')).toBe(3);
    });
  });

  describe('findPhotoIds', () => {
    it('retourne les IDs des photos de l\'album', async () => {
      jest.spyOn(repo, 'find').mockResolvedValue([
        { photoId: 'p1' } as any,
        { photoId: 'p2' } as any,
      ]);

      const result = await repo.findPhotoIds('album-1');

      expect(result).toEqual(['p1', 'p2']);
    });

    it('retourne un tableau vide si l\'album n\'a pas de photos', async () => {
      jest.spyOn(repo, 'find').mockResolvedValue([]);

      const result = await repo.findPhotoIds('album-1');

      expect(result).toEqual([]);
    });
  });

  describe('findPhotosPage', () => {
    it('retourne les photos paginées avec le total', async () => {
      const rows = [{ photo: { id: 'p1', s3Key: 'opt/a.jpg' } }];
      mockQueryBuilder.getManyAndCount.mockResolvedValue([rows, 1]);

      const result = await repo.findPhotosPage('album-1', { page: 1, limit: 20, order: 'desc' } as any);

      expect(result[0]).toHaveLength(1);
      expect(result[1]).toBe(1);
    });

    it('respecte l\'ordre ascendant', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await repo.findPhotosPage('album-1', { page: 1, limit: 20, order: 'asc' } as any);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('ap.addedAt', 'ASC');
    });
  });
});
