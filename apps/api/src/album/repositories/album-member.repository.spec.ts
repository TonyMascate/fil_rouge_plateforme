import { AlbumMemberRepository } from './album-member.repository';

const mockQueryBuilder = {
  innerJoin: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  getRawMany: jest.fn(),
};

const mockDataSource = {
  createEntityManager: jest.fn().mockReturnValue({}),
} as any;

describe('AlbumMemberRepository', () => {
  let repo: AlbumMemberRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQueryBuilder.getRawMany.mockResolvedValue([]);

    repo = new AlbumMemberRepository(mockDataSource);
    jest.spyOn(repo, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
  });

  it('should be defined', () => {
    expect(repo).toBeDefined();
  });

  describe('getMembersForAlbums', () => {
    it('retourne un tableau vide si aucun albumId fourni', async () => {
      const result = await repo.getMembersForAlbums([]);

      expect(result).toEqual([]);
      expect(repo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('retourne les membres avec leurs infos pour les albums donnés', async () => {
      const rows = [
        { albumId: 'album-1', id: 'user-1', email: 'alice@test.com', firstName: 'Alice', lastName: 'Martin' },
        { albumId: 'album-1', id: 'user-2', email: 'bob@test.com', firstName: 'Bob', lastName: 'Dupont' },
      ];
      mockQueryBuilder.getRawMany.mockResolvedValue(rows);

      const result = await repo.getMembersForAlbums(['album-1']);

      expect(result).toHaveLength(2);
      expect(result[0].email).toBe('alice@test.com');
      expect(result[1].albumId).toBe('album-1');
    });
  });
});
