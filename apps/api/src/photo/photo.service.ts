import { HttpStatus, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { ErrorCode, PhotoStatus, QuotaResponseDto } from '@repo/shared';

import { AwsService } from '@app/aws/aws.service';
import { ApiException } from '@app/common/api.exception';
import { Photo } from './entities/photo.entity';
import { PhotoListQueryDto } from './dto/photo-list-query.dto';

export interface OptimizeJobData {
  photoId: string;
  rawKey: string;
}

// ─── K-means clustering RGB ───────────────────────────────────────────────────

interface ColorPoint { red: number; green: number; blue: number }

function convertHexToColorPoint(hex: string): ColorPoint {
  return {
    red:   parseInt(hex.slice(1, 3), 16),
    green: parseInt(hex.slice(3, 5), 16),
    blue:  parseInt(hex.slice(5, 7), 16),
  };
}

function convertColorPointToHex({ red, green, blue }: ColorPoint): string {
  return `#${Math.round(red).toString(16).padStart(2, '0')}${Math.round(green).toString(16).padStart(2, '0')}${Math.round(blue).toString(16).padStart(2, '0')}`;
}

function squaredDistanceBetweenColors(colorA: ColorPoint, colorB: ColorPoint): number {
  return (colorA.red - colorB.red) ** 2 + (colorA.green - colorB.green) ** 2 + (colorA.blue - colorB.blue) ** 2;
}

function findNearestCentroidIndex(color: ColorPoint, centroids: ColorPoint[]): number {
  return centroids.reduce(
    (nearestIndex, candidate, candidateIndex) =>
      squaredDistanceBetweenColors(color, candidate) < squaredDistanceBetweenColors(color, centroids[nearestIndex])
        ? candidateIndex
        : nearestIndex,
    0,
  );
}

function clusterColorsByKmeans(
  colorPoints: ColorPoint[],
  numberOfClusters: number,
  maxIterations = 20,
): { centroid: ColorPoint; photoIndices: number[] }[] {
  if (colorPoints.length <= numberOfClusters) {
    return colorPoints.map((point, index) => ({ centroid: point, photoIndices: [index] }));
  }

  // Initialisation k-means++ : choisir des centroïdes de départ bien espacés
  // (évite que tous les centroïdes se retrouvent dans la même zone de couleur)
  const centroids: ColorPoint[] = [colorPoints[Math.floor(Math.random() * colorPoints.length)]];

  while (centroids.length < numberOfClusters) {
    const distanceToNearestCentroid = colorPoints.map(
      (point) => Math.min(...centroids.map((centroid) => squaredDistanceBetweenColors(point, centroid))),
    );
    const totalDistance = distanceToNearestCentroid.reduce((sum, distance) => sum + distance, 0);

    // Sélection probabiliste : plus un point est loin des centroïdes existants, plus il a de chances d'être choisi
    let remainingDistance = Math.random() * totalDistance;
    let selectedPoint = colorPoints[colorPoints.length - 1];
    for (let i = 0; i < colorPoints.length; i++) {
      remainingDistance -= distanceToNearestCentroid[i];
      if (remainingDistance <= 0) { selectedPoint = colorPoints[i]; break; }
    }
    centroids.push(selectedPoint);
  }

  // Chaque photo reçoit l'index du centroïde dont elle est la plus proche
  let clusterAssignments = colorPoints.map((point) => findNearestCentroidIndex(point, centroids));

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    // Déplacer chaque centroïde au barycentre de ses membres
    for (let clusterIndex = 0; clusterIndex < numberOfClusters; clusterIndex++) {
      const membersOfCluster = colorPoints.filter((_, photoIndex) => clusterAssignments[photoIndex] === clusterIndex);
      if (membersOfCluster.length === 0) continue;
      centroids[clusterIndex] = {
        red:   membersOfCluster.reduce((sum, point) => sum + point.red,   0) / membersOfCluster.length,
        green: membersOfCluster.reduce((sum, point) => sum + point.green, 0) / membersOfCluster.length,
        blue:  membersOfCluster.reduce((sum, point) => sum + point.blue,  0) / membersOfCluster.length,
      };
    }

    // Réassigner chaque photo au centroïde le plus proche après déplacement
    const newAssignments = colorPoints.map((point) => findNearestCentroidIndex(point, centroids));

    // Si aucune photo n'a changé de cluster : l'algorithme a convergé
    if (newAssignments.every((assignment, index) => assignment === clusterAssignments[index])) break;
    clusterAssignments = newAssignments;
  }

  return Array.from({ length: numberOfClusters }, (_, clusterIndex) => ({
    centroid: centroids[clusterIndex],
    photoIndices: clusterAssignments
      .map((assignment, photoIndex) => (assignment === clusterIndex ? photoIndex : -1))
      .filter((index) => index >= 0),
  })).filter((cluster) => cluster.photoIndices.length > 0);
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class PhotoService {
  constructor(
    @InjectRepository(Photo) private readonly photoRepo: Repository<Photo>,
    @InjectQueue('image-queue') private readonly imageQueue: Queue<OptimizeJobData>,
    private readonly aws: AwsService,
    private readonly config: ConfigService,
  ) {}

  private getMaxStorageBytes(): number {
    return parseInt(
      this.config.get<string>('MAX_STORAGE_PER_USER_BYTES') ?? String(500 * 1024 * 1024),
      10,
    );
  }

  async storageUsedForUser(userId: string): Promise<number> {
    const result = await this.photoRepo
      .createQueryBuilder('photo')
      .select('COALESCE(SUM(photo.fileSizeBytes), 0)', 'total')
      .where('photo.userId = :userId', { userId })
      .andWhere('photo.status = :status', { status: PhotoStatus.COMPLETED })
      .getRawOne<{ total: string }>();
    return parseInt(result?.total ?? '0', 10);
  }

  async getQuotaForUser(userId: string): Promise<QuotaResponseDto> {
    const usedBytes = await this.storageUsedForUser(userId);
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
      { photoId: photo.id, rawKey: input.key },
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

    if (!photo || photo.userId !== userId) {
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

  async listByColors(userId: string) {
    const photos = await this.photoRepo.find({
      where: { userId, status: PhotoStatus.COMPLETED },
      order: { createdAt: 'DESC' },
    });

    const photosWithDominantColor = photos.filter((photo) => photo.dominantColor);
    if (photosWithDominantColor.length === 0) return [];

    const dominantColorPoints = photosWithDominantColor.map((photo) =>
      convertHexToColorPoint(photo.dominantColor!),
    );

    // k augmente avec le nombre de photos : 3 clusters pour 18 photos, 7 pour 98, 10 max
    const numberOfClusters = Math.max(3, Math.min(10, Math.round(Math.sqrt(photosWithDominantColor.length / 2))));
    const colorClusters = clusterColorsByKmeans(dominantColorPoints, numberOfClusters);

    return colorClusters.map(({ centroid, photoIndices }) => {
      const photosInCluster = photoIndices.map((index) => photosWithDominantColor[index]);
      const representativeColor = convertColorPointToHex(centroid);
      return {
        family: representativeColor,
        representativeColor,
        count: photosInCluster.length,
        photos: photosInCluster.slice(0, 50).map((photo) => ({
          id: photo.id,
          url: this.aws.getSignedImageUrl(photo.s3Key),
          originalName: photo.originalName,
          dominantColor: photo.dominantColor,
        })),
      };
    });
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
      items: photos.map((photo) => ({
        id: photo.id,
        url: this.aws.getSignedImageUrl(photo.s3Key),
        originalName: photo.originalName,
        createdAt: photo.createdAt,
        shareToken: photo.shareToken,
      })),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  private async findOwnedOrThrow(id: string, userId: string): Promise<Photo> {
    const photo = await this.photoRepo.findOne({ where: { id } });
    if (!photo || photo.userId !== userId) {
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
