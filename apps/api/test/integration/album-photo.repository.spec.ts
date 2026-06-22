import { DataSource, Repository } from 'typeorm';
import { PhotoStatus, Role } from '@repo/shared';
import { Photo } from '@app/photo/entities/photo.entity';
import { User } from '@app/users/entities/user.entity';
import { Album } from '@app/album/entities/album.entity';
import { AlbumPhoto } from '@app/album/entities/album-photo.entity';
import { AlbumPhotoRepository } from '@app/album/repositories/album-photo.repository';
import { setupIntegrationDatabase, teardownIntegrationDatabase, clearTables } from './db.helper';

describe('AlbumPhotoRepository — Intégration', () => {
  let dataSource: DataSource;
  let repo: AlbumPhotoRepository;
  let userRepo: Repository<User>;
  let photoRepo: Repository<Photo>;
  let albumRepo: Repository<Album>;
  let albumPhotoRepo: Repository<AlbumPhoto>;
  let user: User;

  beforeAll(async () => {
    dataSource = await setupIntegrationDatabase();
    repo = new AlbumPhotoRepository(dataSource);
    userRepo = dataSource.getRepository(User);
    photoRepo = dataSource.getRepository(Photo);
    albumRepo = dataSource.getRepository(Album);
    albumPhotoRepo = dataSource.getRepository(AlbumPhoto);
  }, 120_000);

  afterAll(() => teardownIntegrationDatabase());

  beforeEach(async () => {
    await clearTables();
    user = await userRepo.save({ email: 'u@e.com', password: 'x', firstName: 'A', lastName: 'B', role: Role.USER });
  });

  async function createPhoto(s3Key: string, status = PhotoStatus.COMPLETED): Promise<Photo> {
    return photoRepo.save({ s3Key, originalName: 'f.jpg', status, fileSizeBytes: 100, userId: user.id });
  }

  function createPhotoWithCells(s3Key: string, colorCells: string[]): Promise<Photo> {
    return photoRepo.save({ s3Key, originalName: 'f.jpg', status: PhotoStatus.COMPLETED, fileSizeBytes: 100, userId: user.id, colorCells });
  }

  // Insertion avec added_at explicite pour tester l'ordre de la window function
  async function addPhotoToAlbumAt(albumId: string, photoId: string, addedAt: Date): Promise<void> {
    await dataSource.query(
      `INSERT INTO album_photos (album_id, photo_id, added_at) VALUES ($1, $2, $3)`,
      [albumId, photoId, addedAt],
    );
  }

  describe('getCoversS3KeysForAlbums', () => {
    it("retourne une Map vide pour un tableau d'albumIds vide", async () => {
      const result = await repo.getCoversS3KeysForAlbums([]);
      expect(result.size).toBe(0);
    });

    it('retourne au maximum 4 clés par album (window function ROW_NUMBER)', async () => {
      const album = await albumRepo.save({ name: 'Test', userId: user.id });
      const photos = await Promise.all(
        Array.from({ length: 6 }, (_, idx) => createPhoto(`key-${idx}.jpg`)),
      );
      for (const photo of photos) {
        await albumPhotoRepo.save({ albumId: album.id, photoId: photo.id });
      }

      const result = await repo.getCoversS3KeysForAlbums([album.id]);
      expect(result.get(album.id)).toHaveLength(4);
    });

    it('exclut les photos non-COMPLETED (PENDING et FAILED)', async () => {
      const album = await albumRepo.save({ name: 'Test', userId: user.id });
      const completed = await createPhoto('completed.jpg', PhotoStatus.COMPLETED);
      const pending = await createPhoto('pending.jpg', PhotoStatus.PENDING);

      await albumPhotoRepo.save([
        { albumId: album.id, photoId: completed.id },
        { albumId: album.id, photoId: pending.id },
      ]);

      const result = await repo.getCoversS3KeysForAlbums([album.id]);
      const keys = result.get(album.id) ?? [];
      expect(keys).toContain('completed.jpg');
      expect(keys).not.toContain('pending.jpg');
    });

    it('gère plusieurs albumIds via ANY($1)', async () => {
      const album1 = await albumRepo.save({ name: 'A1', userId: user.id });
      const album2 = await albumRepo.save({ name: 'A2', userId: user.id });
      const photo1 = await createPhoto('a1.jpg');
      const photo2 = await createPhoto('a2.jpg');

      await albumPhotoRepo.save([
        { albumId: album1.id, photoId: photo1.id },
        { albumId: album2.id, photoId: photo2.id },
      ]);

      const result = await repo.getCoversS3KeysForAlbums([album1.id, album2.id]);
      expect(result.get(album1.id)).toContain('a1.jpg');
      expect(result.get(album2.id)).toContain('a2.jpg');
    });

    it('ordonne par added_at DESC — la photo la plus récente est la première cover', async () => {
      const album = await albumRepo.save({ name: 'Ordered', userId: user.id });
      const older = await createPhoto('older.jpg');
      const newer = await createPhoto('newer.jpg');

      await addPhotoToAlbumAt(album.id, older.id, new Date('2024-01-01T10:00:00Z'));
      await addPhotoToAlbumAt(album.id, newer.id, new Date('2024-01-02T10:00:00Z'));

      const result = await repo.getCoversS3KeysForAlbums([album.id]);
      const keys = result.get(album.id) ?? [];
      expect(keys[0]).toBe('newer.jpg');
      expect(keys[1]).toBe('older.jpg');
    });
  });

  describe('countByAlbumIds', () => {
    it("retourne une Map vide pour un tableau vide", async () => {
      const result = await repo.countByAlbumIds([]);
      expect(result.size).toBe(0);
    });

    it('compte correctement le nombre de photos par album', async () => {
      const album1 = await albumRepo.save({ name: 'A1', userId: user.id });
      const album2 = await albumRepo.save({ name: 'A2', userId: user.id });
      const photos = await Promise.all([
        createPhoto('p1.jpg'), createPhoto('p2.jpg'), createPhoto('p3.jpg'),
      ]);

      await albumPhotoRepo.save([
        { albumId: album1.id, photoId: photos[0].id },
        { albumId: album1.id, photoId: photos[1].id },
        { albumId: album2.id, photoId: photos[2].id },
      ]);

      const result = await repo.countByAlbumIds([album1.id, album2.id]);
      expect(result.get(album1.id)).toBe(2);
      expect(result.get(album2.id)).toBe(1);
    });
  });

  describe('findPhotosByCellPage', () => {
    const query = { page: 1, limit: 20, order: 'desc' as const };

    it('renvoie les photos de l\'album dans une cellule, avec le total (sans planter sur le comptage)', async () => {
      const album = await albumRepo.save({ name: 'A', userId: user.id });
      const blue = await createPhotoWithCells('blue.jpg', ['c-9-0']);
      const neutral = await createPhotoWithCells('neutral.jpg', ['n-1']);
      await albumPhotoRepo.save([
        { albumId: album.id, photoId: blue.id },
        { albumId: album.id, photoId: neutral.id },
      ]);

      const [rows, total] = await repo.findPhotosByCellPage(album.id, user.id, 'c-9-0', query);

      expect(total).toBe(1);
      expect(rows[0].photo.s3Key).toBe('blue.jpg');
    });

    it('exclut les photos hors album, hors cellule, et limite à l\'utilisateur', async () => {
      const other = await userRepo.save({ email: 'o3@e.com', password: 'x', firstName: 'O', lastName: 'U', role: Role.USER });
      const album = await albumRepo.save({ name: 'A', userId: user.id });

      const match = await createPhotoWithCells('match.jpg', ['c-9-0']);
      const wrongCell = await createPhotoWithCells('wrong-cell.jpg', ['c-4-1']);
      const notInAlbum = await createPhotoWithCells('not-in-album.jpg', ['c-9-0']);
      const otherUserPhoto = await photoRepo.save({ s3Key: 'other.jpg', originalName: 'f.jpg', status: PhotoStatus.COMPLETED, fileSizeBytes: 100, userId: other.id, colorCells: ['c-9-0'] });

      await albumPhotoRepo.save([
        { albumId: album.id, photoId: match.id },
        { albumId: album.id, photoId: wrongCell.id },
        { albumId: album.id, photoId: otherUserPhoto.id },
      ]);
      // notInAlbum n'est ajoutée à aucun album.
      void notInAlbum;

      const [rows, total] = await repo.findPhotosByCellPage(album.id, user.id, 'c-9-0', query);

      expect(total).toBe(1);
      expect(rows[0].photo.s3Key).toBe('match.jpg');
    });
  });
});
