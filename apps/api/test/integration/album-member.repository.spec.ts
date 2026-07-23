import { DataSource, Repository } from 'typeorm';
import { Role } from '@repo/shared';
import { User } from '@app/users/entities/user.entity';
import { Album } from '@app/album/entities/album.entity';
import { AlbumMember } from '@app/album/entities/album-member.entity';
import { AlbumMemberRepository } from '@app/album/repositories/album-member.repository';
import { setupIntegrationDatabase, teardownIntegrationDatabase, clearTables } from './db.helper';

describe('AlbumMemberRepository — Intégration', () => {
  let dataSource: DataSource;
  let repo: AlbumMemberRepository;
  let userRepo: Repository<User>;
  let albumRepo: Repository<Album>;
  let memberRepo: Repository<AlbumMember>;
  let owner: User;

  beforeAll(async () => {
    dataSource = await setupIntegrationDatabase();
    repo = new AlbumMemberRepository(dataSource);
    userRepo = dataSource.getRepository(User);
    albumRepo = dataSource.getRepository(Album);
    memberRepo = dataSource.getRepository(AlbumMember);
  }, 120_000);

  afterAll(() => teardownIntegrationDatabase());

  beforeEach(async () => {
    await clearTables();
    owner = await userRepo.save({
      email: 'owner@e.com',
      password: 'x',
      firstName: 'Owner',
      lastName: 'User',
      role: Role.USER,
    });
  });

  describe('getMembersForAlbums', () => {
    it('retourne une liste vide si albumIds est vide', async () => {
      const result = await repo.getMembersForAlbums([]);
      expect(result).toEqual([]);
    });

    it('retourne les membres avec leurs données utilisateur via INNER JOIN', async () => {
      const member = await userRepo.save({
        email: 'alice@e.com',
        password: 'x',
        firstName: 'Alice',
        lastName: 'Martin',
        role: Role.USER,
      });
      const album = await albumRepo.save({ name: 'Mon album', userId: owner.id });
      await memberRepo.save({ albumId: album.id, userId: member.id });

      const result = await repo.getMembersForAlbums([album.id]);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        albumId: album.id,
        id: member.id,
        email: 'alice@e.com',
        firstName: 'Alice',
        lastName: 'Martin',
      });
    });

    it('regroupe les membres de plusieurs albums dans un seul appel', async () => {
      const member = await userRepo.save({
        email: 'shared@e.com',
        password: 'x',
        firstName: 'Shared',
        lastName: 'User',
        role: Role.USER,
      });
      const album1 = await albumRepo.save({ name: 'A1', userId: owner.id });
      const album2 = await albumRepo.save({ name: 'A2', userId: owner.id });

      await memberRepo.save([
        { albumId: album1.id, userId: member.id },
        { albumId: album2.id, userId: member.id },
      ]);

      const result = await repo.getMembersForAlbums([album1.id, album2.id]);

      expect(result).toHaveLength(2);
      const albumIds = result.map((row) => row.albumId);
      expect(albumIds).toContain(album1.id);
      expect(albumIds).toContain(album2.id);
    });
  });
});
