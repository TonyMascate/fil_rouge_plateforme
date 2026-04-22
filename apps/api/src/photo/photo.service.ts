import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { ErrorCode, PhotoStatus } from '@repo/shared';

import { AwsService } from '@app/aws/aws.service';
import { ApiException } from '@app/common/api.exception';
import { Photo } from './entities/photo.entity';
import { PhotoListQueryDto } from './dto/photo-list-query.dto';

export interface OptimizeJobData {
  photoId: string;
  rawKey: string;
}

@Injectable()
export class PhotoService {
  constructor(
    @InjectRepository(Photo) private readonly photoRepo: Repository<Photo>,
    @InjectQueue('image-queue') private readonly imageQueue: Queue<OptimizeJobData>,
    private readonly aws: AwsService,
  ) {}

  async storageUsedForUser(userId: string): Promise<number> {
    const result = await this.photoRepo
      .createQueryBuilder('photo')
      .select('COALESCE(SUM(photo.fileSizeBytes), 0)', 'total')
      .where('photo.userId = :userId', { userId })
      .andWhere('photo.status = :status', { status: PhotoStatus.COMPLETED })
      .getRawOne<{ total: string }>();
    return parseInt(result?.total ?? '0', 10);
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
      url: photo.status === PhotoStatus.COMPLETED ? photo.cloudFrontUrl : null,
    };
  }

  async listForUser(userId: string, query: PhotoListQueryDto) {
    const { page, limit } = query;

    const [photos, total] = await this.photoRepo.findAndCount({
      where: { userId, status: PhotoStatus.COMPLETED },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: photos.map((p) => ({
        id: p.id,
        url: p.cloudFrontUrl,
        originalName: p.originalName,
        createdAt: p.createdAt,
      })),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }
}
