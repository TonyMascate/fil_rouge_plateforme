import { DataSource, Repository } from 'typeorm';
import { PhotoStatus, Role } from '@repo/shared';
import { Photo } from '@app/photo/entities/photo.entity';
import { User } from '@app/users/entities/user.entity';
import { Album } from '@app/album/entities/album.entity';
import { AlbumPhoto } from '@app/album/entities/album-photo.entity';
import { PhotoRepository } from '@app/photo/repositories/photo.repository';
import { setupIntegrationDatabase, teardownIntegrationDatabase, clearTables } from './db.helper';

const LIST_QUERY = { page: 1, limit: 20, order: 'desc' as const };

describe('PhotoRepository — Intégration', () => {
  let dataSource: DataSource;
  let photoRepository: PhotoRepository;
  let userRepo: Repository<User>;
  let photoRepo: Repository<Photo>;
  let albumRepo: Repository<Album>;
  let albumPhotoRepo: Repository<AlbumPhoto>;
  let user: User;

  beforeAll(async () => {
    dataSource = await setupIntegrationDatabase();
    photoRepository = new PhotoRepository(dataSource);
    userRepo = dataSource.getRepository(User);
    photoRepo = dataSource.getRepository(Photo);
    albumRepo = dataSource.getRepository(Album);
    albumPhotoRepo = dataSource.getRepository(AlbumPhoto);
  }, 120_000);

  afterAll(async () => {
    await teardownIntegrationDatabase();
  });

  beforeEach(async () => {
    await clearTables();
    user = await userRepo.save({
      email: 'test@example.com',
      password: 'hashed',
      firstName: 'Test',
      lastName: 'User',
      role: Role.USER,
    });
  });

  function createPhoto(s3Key: string, colorCells: string[] | null, status = PhotoStatus.COMPLETED): Promise<Photo> {
    return photoRepo.save({ s3Key, originalName: 'f.jpg', status, fileSizeBytes: 100, userId: user.id, colorCells });
  }

  describe('storageUsedByUser', () => {
    it("retourne 0 quand l'utilisateur n'a aucune photo", async () => {
      const total = await photoRepository.storageUsedByUser(user.id);
      expect(total).toBe(0);
    });

    it('somme uniquement les photos avec statut COMPLETED', async () => {
      await photoRepo.save([
        { s3Key: 'key1', originalName: 'a.jpg', status: PhotoStatus.COMPLETED, fileSizeBytes: 1000, userId: user.id },
        { s3Key: 'key2', originalName: 'b.jpg', status: PhotoStatus.COMPLETED, fileSizeBytes: 2000, userId: user.id },
        { s3Key: 'key3', originalName: 'c.jpg', status: PhotoStatus.PENDING, fileSizeBytes: 9999, userId: user.id },
        { s3Key: 'key4', originalName: 'd.jpg', status: PhotoStatus.FAILED, fileSizeBytes: 9999, userId: user.id },
      ]);
      const total = await photoRepository.storageUsedByUser(user.id);
      expect(total).toBe(3000);
    });

    it("ignore les photos d'un autre utilisateur", async () => {
      const other = await userRepo.save({
        email: 'other@example.com', password: 'x', firstName: 'O', lastName: 'U', role: Role.USER,
      });
      await photoRepo.save([
        { s3Key: 'key1', originalName: 'a.jpg', status: PhotoStatus.COMPLETED, fileSizeBytes: 1000, userId: user.id },
        { s3Key: 'key2', originalName: 'b.jpg', status: PhotoStatus.COMPLETED, fileSizeBytes: 9999, userId: other.id },
      ]);
      const total = await photoRepository.storageUsedByUser(user.id);
      expect(total).toBe(1000);
    });

    it('COALESCE retourne 0 si toutes les tailles sont null', async () => {
      await photoRepo.save({ s3Key: 'key1', originalName: 'a.jpg', status: PhotoStatus.COMPLETED, fileSizeBytes: null, userId: user.id });
      const total = await photoRepository.storageUsedByUser(user.id);
      expect(total).toBe(0);
    });
  });

  describe('countByColorCell', () => {
    it('compte une photo dans chacune des cellules de son tableau (appartenance multiple)', async () => {
      await createPhoto('a.jpg', ['c-9-0', 'n-1']);
      await createPhoto('b.jpg', ['c-9-0']);
      await createPhoto('c.jpg', ['n-1']);

      const rows = await photoRepository.countByColorCell(user.id);
      const countByCell = new Map(rows.map((row) => [row.cellId, Number(row.count)]));

      expect(countByCell.get('c-9-0')).toBe(2);
      expect(countByCell.get('n-1')).toBe(2);
    });

    it('ignore les photos non-COMPLETED et celles des autres utilisateurs', async () => {
      const other = await userRepo.save({ email: 'o@e.com', password: 'x', firstName: 'O', lastName: 'U', role: Role.USER });
      await createPhoto('completed.jpg', ['c-9-0']);
      await createPhoto('pending.jpg', ['c-9-0'], PhotoStatus.PENDING);
      await photoRepo.save({ s3Key: 'other.jpg', originalName: 'f.jpg', status: PhotoStatus.COMPLETED, fileSizeBytes: 100, userId: other.id, colorCells: ['c-9-0'] });

      const rows = await photoRepository.countByColorCell(user.id);
      const countByCell = new Map(rows.map((row) => [row.cellId, Number(row.count)]));

      expect(countByCell.get('c-9-0')).toBe(1);
    });

    it('filtré par album : ne multiplie pas les comptes (régression produit cartésien)', async () => {
      const album = await albumRepo.save({ name: 'A', userId: user.id });
      const inAlbumBlue = await createPhoto('in-blue.jpg', ['c-9-0']);
      const inAlbumNeutral = await createPhoto('in-neutral.jpg', ['n-1']);
      // Photos hors album, même cellule : un produit cartésien gonflerait le compte.
      await createPhoto('out1.jpg', ['c-9-0']);
      await createPhoto('out2.jpg', ['c-9-0']);
      await albumPhotoRepo.save([
        { albumId: album.id, photoId: inAlbumBlue.id },
        { albumId: album.id, photoId: inAlbumNeutral.id },
      ]);

      const rows = await photoRepository.countByColorCell(user.id, album.id);
      const countByCell = new Map(rows.map((row) => [row.cellId, Number(row.count)]));

      // Seule la photo de l'album compte, pas × le nombre total de photos.
      expect(countByCell.get('c-9-0')).toBe(1);
      expect(countByCell.get('n-1')).toBe(1);
    });
  });

  describe('findByColorCellPage', () => {
    it('renvoie les photos dont color_cells contient la cellule, avec le total', async () => {
      await createPhoto('blue1.jpg', ['c-9-0', 'n-1']);
      await createPhoto('blue2.jpg', ['c-9-0']);
      await createPhoto('green.jpg', ['c-4-1']);

      const [photos, total] = await photoRepository.findByColorCellPage(user.id, 'c-9-0', LIST_QUERY);

      expect(total).toBe(2);
      expect(photos.map((photo) => photo.s3Key).sort()).toEqual(['blue1.jpg', 'blue2.jpg']);
    });

    it('scope sur l\'utilisateur et les photos COMPLETED', async () => {
      const other = await userRepo.save({ email: 'o2@e.com', password: 'x', firstName: 'O', lastName: 'U', role: Role.USER });
      await createPhoto('mine.jpg', ['c-9-0']);
      await createPhoto('pending.jpg', ['c-9-0'], PhotoStatus.PENDING);
      await photoRepo.save({ s3Key: 'other.jpg', originalName: 'f.jpg', status: PhotoStatus.COMPLETED, fileSizeBytes: 100, userId: other.id, colorCells: ['c-9-0'] });

      const [photos, total] = await photoRepository.findByColorCellPage(user.id, 'c-9-0', LIST_QUERY);

      expect(total).toBe(1);
      expect(photos[0].s3Key).toBe('mine.jpg');
    });

    it('pagine les résultats', async () => {
      for (let index = 0; index < 5; index++) await createPhoto(`p${index}.jpg`, ['c-9-0']);

      const [photos, total] = await photoRepository.findByColorCellPage(user.id, 'c-9-0', { page: 1, limit: 2, order: 'desc' });

      expect(total).toBe(5);
      expect(photos).toHaveLength(2);
    });
  });
});
