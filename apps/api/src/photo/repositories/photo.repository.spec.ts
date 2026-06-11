import { PhotoRepository } from './photo.repository';

const mockQueryBuilder = {
  select: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  getRawOne: jest.fn(),
};

const mockDataSource = {
  createEntityManager: jest.fn().mockReturnValue({}),
} as any;

describe('PhotoRepository', () => {
  let repo: PhotoRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQueryBuilder.getRawOne.mockResolvedValue(null);

    repo = new PhotoRepository(mockDataSource);
    jest.spyOn(repo, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
  });

  it('should be defined', () => {
    expect(repo).toBeDefined();
  });

  describe('storageUsedByUser', () => {
    it('retourne le total des octets utilisés parsé en entier', async () => {
      mockQueryBuilder.getRawOne.mockResolvedValue({ total: '5242880' });

      const result = await repo.storageUsedByUser('user-uuid');

      expect(repo.createQueryBuilder).toHaveBeenCalledWith('photo');
      expect(result).toBe(5_242_880);
    });

    it('retourne 0 si aucune photo (résultat null de la BDD)', async () => {
      mockQueryBuilder.getRawOne.mockResolvedValue(null);

      const result = await repo.storageUsedByUser('user-uuid');

      expect(result).toBe(0);
    });

    it('retourne 0 si total est "0" (aucune photo COMPLETED)', async () => {
      mockQueryBuilder.getRawOne.mockResolvedValue({ total: '0' });

      const result = await repo.storageUsedByUser('user-uuid');

      expect(result).toBe(0);
    });
  });
});
