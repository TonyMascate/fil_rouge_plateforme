import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { PhotoStatus } from '@repo/shared';
import { Photo } from '../entities/photo.entity';

@Injectable()
export class PhotoRepository extends Repository<Photo> {
  constructor(dataSource: DataSource) {
    super(Photo, dataSource.createEntityManager());
  }

  async storageUsedByUser(userId: string): Promise<number> {
    const result = await this.createQueryBuilder('photo')
      .select('COALESCE(SUM(photo.fileSizeBytes), 0)', 'total')
      .where('photo.userId = :userId', { userId })
      .andWhere('photo.status = :status', { status: PhotoStatus.COMPLETED })
      .getRawOne<{ total: string }>();
    return parseInt(result?.total ?? '0', 10);
  }
}
