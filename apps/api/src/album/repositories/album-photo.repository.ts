import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { PhotoStatus } from '@repo/shared';
import { PhotoListQueryDto } from '@app/photo/dto/photo-list-query.dto';
import { AlbumPhoto } from '../entities/album-photo.entity';

@Injectable()
export class AlbumPhotoRepository extends Repository<AlbumPhoto> {
  constructor(dataSource: DataSource) {
    super(AlbumPhoto, dataSource.createEntityManager());
  }

  // Tiebreaker `photo_id DESC` : ordre stable si deux photos partagent le même added_at (bulk insert)
  async getCoversS3KeysForAlbums(albumIds: string[]): Promise<Map<string, string[]>> {
    if (albumIds.length === 0) return new Map();
    const rows = await this.manager.query<{ albumId: string; s3Key: string }[]>(
      `SELECT album_id AS "albumId", s3_key AS "s3Key"
       FROM (
         SELECT ap.album_id, p.s3_key,
                ROW_NUMBER() OVER (
                  PARTITION BY ap.album_id
                  ORDER BY ap.added_at DESC, ap.photo_id DESC
                ) AS rn
         FROM album_photos ap
         INNER JOIN photos p ON p.id = ap.photo_id
         WHERE ap.album_id = ANY($1) AND p.status = $2
       ) ranked
       WHERE rn <= 4`,
      [albumIds, PhotoStatus.COMPLETED],
    );
    const map = new Map<string, string[]>();
    for (const row of rows) {
      const list = map.get(row.albumId) ?? [];
      list.push(row.s3Key);
      map.set(row.albumId, list);
    }
    return map;
  }

  async countByAlbumIds(albumIds: string[]): Promise<Map<string, number>> {
    if (albumIds.length === 0) return new Map();
    const rows = await this.createQueryBuilder('ap')
      .select('ap.albumId', 'albumId')
      .addSelect('COUNT(*)', 'count')
      .where('ap.albumId IN (:...albumIds)', { albumIds })
      .groupBy('ap.albumId')
      .getRawMany<{ albumId: string; count: string }>();
    return new Map(rows.map((row) => [row.albumId, parseInt(row.count, 10)]));
  }

  async findPhotoIds(albumId: string): Promise<string[]> {
    const rows = await this.find({ where: { albumId }, select: ['photoId'] });
    return rows.map((row) => row.photoId);
  }

  async findPhotosPage(albumId: string, query: PhotoListQueryDto): Promise<[AlbumPhoto[], number]> {
    const { page, limit, order } = query;
    return this.createQueryBuilder('ap')
      .innerJoinAndSelect('ap.photo', 'p')
      .where('ap.albumId = :albumId', { albumId })
      .andWhere('p.status = :status', { status: PhotoStatus.COMPLETED })
      .orderBy('ap.addedAt', order === 'asc' ? 'ASC' : 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
  }

  // Photos d'un album appartenant à un utilisateur et tombant dans une cellule
  // d'atlas donnée — alimente l'exploration chromatique filtrée par album.
  async findPhotosByCellPage(
    albumId: string,
    userId: string,
    cellId: string,
    query: PhotoListQueryDto,
  ): Promise<[AlbumPhoto[], number]> {
    const { page, limit, order } = query;
    // Tri sur ap.addedAt (colonne racine) et non p.created_at : trier sur la
    // colonne d'une entité jointe casse le getManyAndCount() de TypeORM. C'est
    // aussi l'ordre utilisé par la vue album classique (findPhotosPage).
    return this.createQueryBuilder('ap')
      .innerJoinAndSelect('ap.photo', 'p')
      .where('ap.albumId = :albumId', { albumId })
      .andWhere('p.user_id = :userId', { userId })
      .andWhere('p.status = :status', { status: PhotoStatus.COMPLETED })
      // `@> ARRAY[:cellId]` (« contient ») et non `= ANY(...)` : seule la forme
      // « contient » exploite l'index GIN sur color_cells (sinon seq scan).
      .andWhere('p.color_cells @> ARRAY[:cellId]', { cellId })
      .orderBy('ap.addedAt', order === 'asc' ? 'ASC' : 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
  }
}
