import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PassThrough } from 'stream';
import sharp from 'sharp';
import { PhotoStatus } from '@repo/shared';

import { AwsService } from '@app/aws/aws.service';
import { RedisService } from '@app/redis/redis.service';
import { PhotoRepository } from './repositories/photo.repository';
import { OptimizeJobData } from './photo.service';
import { colorAtlasCacheKey } from './photo.service';
import { extractPalette, cellsFromPalette, PaletteEntry } from './color';

// ─────────────────────────────────────────────────────────────────────────────

@Processor('image-queue')
export class PhotoProcessor extends WorkerHost {
  private readonly logger = new Logger(PhotoProcessor.name);

  constructor(
    private readonly aws: AwsService,
    private readonly photoRepo: PhotoRepository,
    private readonly redis: RedisService,
  ) {
    super();
  }

  async process(job: Job<OptimizeJobData>): Promise<void> {
    const { photoId, rawKey, userId } = job.data;
    this.logger.log(`Processing job ${job.id} for photo ${photoId}`);

    await this.photoRepo.update(photoId, { status: PhotoStatus.PROCESSING });

    const optimizedKey = rawKey.replace('raw/', 'optimized/').replace(/\.[^/.]+$/, '.webp');

    const inputStream = await this.aws.downloadStream(rawKey);

    const base = sharp();

    const colorFork = base.clone()
      .resize(50, 50, { fit: 'cover' })
      .removeAlpha()
      .raw();

    const uploadTransform = base.clone()
      .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 });

    const passThrough = new PassThrough();
    const uploadPromise = this.aws.uploadStream(optimizedKey, passThrough, 'image/webp');

    inputStream.pipe(base);
    uploadTransform.pipe(passThrough);

    let palette: PaletteEntry[] = [];
    const [colorBuf] = await Promise.all([
      colorFork.toBuffer().catch(() => null),
      uploadPromise,
    ]);

    if (colorBuf && colorBuf.length >= 3) {
      palette = extractPalette(colorBuf);
    }

    await this.aws.deleteObject(rawKey);

    const optimizedHead = await this.aws.headObject(optimizedKey).catch(() => null);

    await this.photoRepo.update(photoId, {
      status: PhotoStatus.COMPLETED,
      s3Key: optimizedKey,
      fileSizeBytes: optimizedHead?.ContentLength ?? null,
      dominantColor: palette[0]?.hex ?? null,
      palette: palette.length > 0 ? palette : null,
      colorCells: palette.length > 0 ? cellsFromPalette(palette) : null,
    });

    // L'atlas couleur de cet utilisateur a changé : on purge son cache.
    await this.redis
      .del(colorAtlasCacheKey(userId))
      .catch((error) => this.logger.warn({ userId, err: error }, 'Failed to invalidate color atlas cache'));

    this.logger.log(`Photo ${photoId} optimized → ${optimizedKey}`);
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<OptimizeJobData>, error: Error) {
    this.logger.error(
      { photoId: job.data.photoId, jobId: job.id, err: error },
      `Job failed for photo ${job.data.photoId}`,
    );
    await this.photoRepo.update(job.data.photoId, { status: PhotoStatus.FAILED });
    await this.aws
      .deleteObject(job.data.rawKey)
      .catch((e) => this.logger.error({ key: job.data.rawKey, err: e }, 'Failed to delete raw object after job failure'));
  }
}
