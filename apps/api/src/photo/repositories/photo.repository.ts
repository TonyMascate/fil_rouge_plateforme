import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { PhotoStatus } from '@repo/shared';
import { Photo } from '../entities/photo.entity';
import { PhotoListQueryDto } from '../dto/photo-list-query.dto';

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

  /**
   * Nombre de photos par cellule d'atlas pour un utilisateur (une photo est
   * comptée dans chacune des cellules de son tableau color_cells). `albumId`
   * optionnel restreint aux photos d'un album. SQL direct : le sous-select via
   * query builder produisait un produit cartésien avec la table principale.
   */
  async countByColorCell(
    userId: string,
    albumId?: string,
  ): Promise<Array<{ cellId: string; count: number }>> {
    return this.query(
      `SELECT cell AS "cellId", COUNT(*)::int AS count
         FROM (
           SELECT UNNEST(p.color_cells) AS cell
           FROM photos p
           ${albumId ? 'INNER JOIN album_photos ap ON ap.photo_id = p.id AND ap.album_id = $3' : ''}
           WHERE p.user_id = $1 AND p.status = $2
         ) AS cells
        GROUP BY cell`,
      albumId ? [userId, PhotoStatus.COMPLETED, albumId] : [userId, PhotoStatus.COMPLETED],
    );
  }

  /** Photos d'une cellule d'atlas pour un utilisateur, paginées. */
  async findByColorCellPage(
    userId: string,
    cellId: string,
    query: PhotoListQueryDto,
  ): Promise<[Photo[], number]> {
    const { page, limit, order } = query;
    return this.createQueryBuilder('photo')
      .where('photo.user_id = :userId', { userId })
      .andWhere('photo.status = :status', { status: PhotoStatus.COMPLETED })
      // `@> ARRAY[:cellId]` (« contient ») et non `= ANY(...)` : seule la forme
      // « contient » exploite l'index GIN sur color_cells (sinon seq scan).
      .andWhere('photo.color_cells @> ARRAY[:cellId]', { cellId })
      .orderBy('photo.created_at', order === 'asc' ? 'ASC' : 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
  }
}
