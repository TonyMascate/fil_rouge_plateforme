import { HttpStatus, Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  ColorAtlasCellDto,
  ColorCellPhotosResponseDto,
  ErrorCode,
  PhotoStatus,
  QuotaResponseDto,
  getAtlasCells,
} from '@repo/shared';

import { AwsService } from '@app/aws/aws.service';
import { RedisService } from '@app/redis/redis.service';
import { ApiException } from '@app/common/api.exception';
import { AlbumPhotoRepository } from '@app/album/repositories/album-photo.repository';
import { Photo } from './entities/photo.entity';
import { PhotoRepository } from './repositories/photo.repository';
import { PhotoListQueryDto } from './dto/photo-list-query.dto';

export interface OptimizeJobData {
  photoId: string;
  rawKey: string;
  userId: string;
}

// Clé de cache de l'atlas couleur d'un utilisateur (purgée à l'ajout/suppression).
export function colorAtlasCacheKey(userId: string): string {
  return `colors:atlas:${userId}`;
}

const COLOR_ATLAS_CACHE_TTL_SECONDS = 300;

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class PhotoService {
  constructor(
    private readonly photoRepo: PhotoRepository,
    @InjectQueue('image-queue') private readonly imageQueue: Queue<OptimizeJobData>,
    private readonly aws: AwsService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    private readonly albumPhotoRepo: AlbumPhotoRepository,
  ) {}

  private getMaxStorageBytes(): number {
    return Number.parseInt(
      this.config.get<string>('MAX_STORAGE_PER_USER_BYTES') ?? String(500 * 1024 * 1024),
      10,
    );
  }

  async getQuotaForUser(userId: string): Promise<QuotaResponseDto> {
    const usedBytes = await this.photoRepo.storageUsedByUser(userId);
    return { usedBytes, maxBytes: this.getMaxStorageBytes() };
  }

  async registerUpload(input: { key: string; originalName: string }, userId: string) {
    let fileSizeBytes: number | null = null;
    try {
      const head = await this.aws.headObject(input.key);
      fileSizeBytes = head.ContentLength ?? null;
    } catch {
      throw new ApiException(
        ErrorCode.PHOTO_S3_MISSING,
        HttpStatus.NOT_FOUND,
        'Fichier introuvable sur S3',
        [],
      );
    }

    const photo = await this.photoRepo.save({
      s3Key: input.key,
      originalName: input.originalName,
      status: PhotoStatus.PENDING,
      fileSizeBytes,
      userId,
    });

    await this.imageQueue.add(
      'optimize',
      { photoId: photo.id, rawKey: input.key, userId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    return { photoId: photo.id, status: photo.status };
  }

  async getStatus(id: string, userId: string) {
    const photo = await this.photoRepo.findOne({ where: { id } });

    if (photo?.userId !== userId) {
      throw new ApiException(
        ErrorCode.PHOTO_NOT_FOUND,
        HttpStatus.NOT_FOUND,
        'Photo introuvable',
        [],
      );
    }

    return {
      id: photo.id,
      status: photo.status,
      url: photo.status === PhotoStatus.COMPLETED ? this.aws.getSignedImageUrl(photo.s3Key) : null,
    };
  }

  /**
   * Atlas couleur de l'utilisateur : la grille fixe de cellules, chacune assortie
   * du nombre de photos qui la contiennent. Léger (agrégat SQL, pas d'URL signée)
   * et mis en cache par utilisateur.
   */
  async getColorAtlas(userId: string, albumId?: string): Promise<ColorAtlasCellDto[]> {
    // Cache réservé à l'atlas non filtré : les variantes par album sont peu
    // fréquentes et leur mise en cache multiplierait les clés à invalider.
    const cacheKey = albumId ? null : colorAtlasCacheKey(userId);
    if (cacheKey) {
      const cached = await this.redis.get(cacheKey).catch(() => null);
      if (cached) return JSON.parse(cached) as ColorAtlasCellDto[];
    }

    // L'agrégat (et le filtre album, scopé user_id donc sans fuite) vit dans le
    // repository ; le service se contente d'orchestrer cache + assemblage.
    const rows = await this.photoRepo.countByColorCell(userId, albumId);
    const countByCell = new Map(rows.map((row) => [row.cellId, Number(row.count)]));

    const atlas = getAtlasCells().map((cell) => ({
      ...cell,
      count: countByCell.get(cell.cellId) ?? 0,
    }));

    if (cacheKey) {
      await this.redis
        .set(cacheKey, JSON.stringify(atlas), 'EX', COLOR_ATLAS_CACHE_TTL_SECONDS)
        .catch(() => undefined);
    }

    return atlas;
  }

  /**
   * Photos d'une cellule d'atlas, paginées. Les URLs S3 ne sont signées que pour
   * la page demandée (et non pour toute la collection).
   */
  async listByCell(
    userId: string,
    cellId: string,
    query: PhotoListQueryDto,
    albumId?: string,
  ): Promise<ColorCellPhotosResponseDto> {
    const { page, limit } = query;

    // Filtré par album : on part de la table de liaison (où vit album_id) ; sinon
    // requête directe sur les photos. Dans les deux cas la couche repository gère
    // l'accès aux données ; le service se contente de mapper la réponse.
    let photos: Photo[];
    let total: number;
    if (albumId) {
      const [albumPhotos, count] = await this.albumPhotoRepo.findPhotosByCellPage(albumId, userId, cellId, query);
      photos = albumPhotos.map((albumPhoto) => albumPhoto.photo);
      total = count;
    } else {
      [photos, total] = await this.photoRepo.findByColorCellPage(userId, cellId, query);
    }

    return {
      cellId,
      items: photos.map((photo) => this.toPhotoResponse(photo)),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async listForUser(userId: string, query: PhotoListQueryDto) {
    const { page, limit, order } = query;

    const [photos, total] = await this.photoRepo.findAndCount({
      where: { userId, status: PhotoStatus.COMPLETED },
      order: { createdAt: order === 'asc' ? 'ASC' : 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: photos.map((photo) => this.toPhotoResponse(photo)),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** Forme commune d'une photo dans les listes (galerie, exploration couleur). */
  private toPhotoResponse(photo: Photo) {
    return {
      id: photo.id,
      url: this.aws.getSignedImageUrl(photo.s3Key),
      originalName: photo.originalName,
      createdAt: photo.createdAt,
      shareToken: photo.shareToken,
    };
  }

  private async findOwnedOrThrow(id: string, userId: string): Promise<Photo> {
    const photo = await this.photoRepo.findOne({ where: { id } });
    if (photo?.userId !== userId) {
      throw new ApiException(ErrorCode.PHOTO_NOT_FOUND, HttpStatus.NOT_FOUND, 'Photo introuvable', []);
    }
    return photo;
  }

  async deletePhoto(id: string, userId: string): Promise<void> {
    const photo = await this.findOwnedOrThrow(id, userId);
    // On supprime la ligne DB d'abord : si l'appel S3 échoue ensuite, on aura un objet
    // orphelin dans le bucket — mais plus aucune référence côté app, donc aucun 404
    // utilisateur. Le cas inverse (S3 supprimé puis DB qui échoue) laisserait une ligne
    // pointant vers un objet inexistant, plus problématique.
    await this.photoRepo.delete(photo.id);
    await this.aws.deleteObject(photo.s3Key).catch(() => undefined);
    // L'atlas couleur a changé → on purge le cache de l'utilisateur.
    await this.redis.del(colorAtlasCacheKey(userId)).catch(() => undefined);
  }

  async sharePhoto(id: string, userId: string): Promise<{ shareToken: string }> {
    const photo = await this.findOwnedOrThrow(id, userId);
    let token = photo.shareToken;
    if (!token) {
      token = randomBytes(16).toString('base64url');
      photo.shareToken = token;
      await this.photoRepo.save(photo);
    }
    return { shareToken: token };
  }

  async unsharePhoto(id: string, userId: string): Promise<void> {
    const photo = await this.findOwnedOrThrow(id, userId);
    if (photo.shareToken) {
      photo.shareToken = null;
      await this.photoRepo.save(photo);
    }
  }

  async getPublicByToken(token: string) {
    const photo = await this.photoRepo.findOne({
      where: { shareToken: token, status: PhotoStatus.COMPLETED },
    });
    if (!photo) {
      throw new ApiException(ErrorCode.PHOTO_NOT_FOUND, HttpStatus.NOT_FOUND, 'Photo introuvable', []);
    }
    return {
      url: this.aws.getSignedImageUrl(photo.s3Key),
      originalName: photo.originalName,
      createdAt: photo.createdAt,
    };
  }
}
