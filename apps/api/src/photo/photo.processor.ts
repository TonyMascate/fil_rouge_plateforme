import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { PassThrough } from 'stream';
import sharp from 'sharp';
import { PhotoStatus } from '@repo/shared';

import { AwsService } from '@app/aws/aws.service';
import { Photo } from './entities/photo.entity';
import { OptimizeJobData } from './photo.service';

@Processor('image-queue')
export class PhotoProcessor extends WorkerHost {
  private readonly logger = new Logger(PhotoProcessor.name);

  constructor(
    private readonly aws: AwsService,
    @InjectRepository(Photo) private readonly photoRepo: Repository<Photo>,
  ) {
    super();
  }

  async process(job: Job<OptimizeJobData>): Promise<void> {
    const { photoId, rawKey } = job.data;
    this.logger.log(`Processing job ${job.id} for photo ${photoId}`);

    await this.photoRepo.update(photoId, { status: PhotoStatus.PROCESSING });

    const optimizedKey = rawKey.replace('raw/', 'optimized/').replace(/\.[^/.]+$/, '.webp');

    const inputStream = await this.aws.downloadStream(rawKey);

    const transform = sharp()
      .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 });

    const passThrough = new PassThrough();

    const uploadPromise = this.aws.uploadStream(optimizedKey, passThrough, 'image/webp');

    inputStream.pipe(transform).pipe(passThrough);

    await uploadPromise;

    await this.aws.deleteObject(rawKey);

    const optimizedHead = await this.aws.headObject(optimizedKey).catch(() => null);

    await this.photoRepo.update(photoId, {
      status: PhotoStatus.COMPLETED,
      s3Key: optimizedKey,
      cloudFrontUrl: this.aws.getPublicUrl(optimizedKey),
      fileSizeBytes: optimizedHead?.ContentLength ?? null,
    });

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
