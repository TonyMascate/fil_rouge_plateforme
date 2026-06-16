import { DataSource, Repository } from 'typeorm';
import { PhotoStatus, Role } from '@repo/shared';
import { Photo } from '@app/photo/entities/photo.entity';
import { User } from '@app/users/entities/user.entity';
import { PhotoRepository } from '@app/photo/repositories/photo.repository';
import { setupIntegrationDatabase, teardownIntegrationDatabase, clearTables } from './db.helper';

describe('PhotoRepository — Intégration', () => {
  let dataSource: DataSource;
  let photoRepository: PhotoRepository;
  let userRepo: Repository<User>;
  let photoRepo: Repository<Photo>;
  let user: User;

  beforeAll(async () => {
    dataSource = await setupIntegrationDatabase();
    photoRepository = new PhotoRepository(dataSource);
    userRepo = dataSource.getRepository(User);
    photoRepo = dataSource.getRepository(Photo);
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
});
