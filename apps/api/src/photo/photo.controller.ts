import { Body, Controller, Get, HttpStatus, Logger, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { CurrentUser } from '@app/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '@app/auth/guards/jwt-auth.guard';
import { AwsService } from '@app/aws/aws.service';
import { ApiException } from '@app/common/api.exception';
import { RedisService } from '@app/redis/redis.service';
import { ErrorCode } from '@repo/shared';
import { PhotoService } from './photo.service';
import { PhotoListQueryDto } from './dto/photo-list-query.dto';
import {
  CompleteMultipartDto,
  CreateMultipartDto,
  MultipartKeyDto,
  SignPartDto,
} from './dto/multipart.dto';

@Controller('photos')
@UseGuards(JwtAuthGuard)
export class PhotoController {
  private readonly logger = new Logger(PhotoController.name);

  constructor(
    private readonly photoService: PhotoService,
    private readonly aws: AwsService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  private async assertUploadOwner(uploadId: string, userId: string) {
    const owner = await this.redis.get(`upload:${uploadId}`);
    if (owner !== userId) {
      throw new ApiException(ErrorCode.FORBIDDEN, HttpStatus.FORBIDDEN, 'Accès refusé', []);
    }
  }

  @Post('uploads/multipart')
  async createMultipart(
    @Body() dto: CreateMultipartDto,
    @CurrentUser() user: { userId: string },
  ) {
    const maxBytes = parseInt(
      this.config.get<string>('MAX_STORAGE_PER_USER_BYTES') ?? String(500 * 1024 * 1024),
      10,
    );
    const used = await this.photoService.storageUsedForUser(user.userId);
    if (used + dto.fileSize > maxBytes) {
      throw new ApiException(ErrorCode.QUOTA_EXCEEDED, HttpStatus.FORBIDDEN, 'Quota de stockage atteint', []);
    }

    const result = await this.aws.createMultipartUpload(dto.contentType);
    await this.redis.set(`upload:${result.uploadId}`, user.userId, 'EX', 3600);
    return result;
  }

  @Post('uploads/multipart/sign-part')
  async signPart(
    @Body() dto: SignPartDto,
    @CurrentUser() user: { userId: string },
  ) {
    await this.assertUploadOwner(dto.uploadId, user.userId);
    const url = await this.aws.signPart(dto.key, dto.uploadId, dto.partNumber);
    return { url };
  }

  @Post('uploads/multipart/list-parts')
  async listParts(
    @Body() dto: MultipartKeyDto,
    @CurrentUser() user: { userId: string },
  ) {
    await this.assertUploadOwner(dto.uploadId, user.userId);
    return this.aws.listParts(dto.key, dto.uploadId);
  }

  // Fusionne : 1) check ownership  2) complete multipart S3  3) INSERT photo  4) enqueue job
  // Si (3) ou (4) fail, on DeleteObject pour éviter les orphelins S3.
  @Post('uploads/multipart/complete')
  async completeMultipart(
    @Body() dto: CompleteMultipartDto,
    @CurrentUser() user: { userId: string },
  ) {
    await this.assertUploadOwner(dto.uploadId, user.userId);
    await this.aws.completeMultipartUpload(dto.key, dto.uploadId, dto.parts);
    await this.redis.del(`upload:${dto.uploadId}`);

    try {
      return await this.photoService.registerUpload(
        { key: dto.key, originalName: dto.originalName },
        user.userId,
      );
    } catch (err) {
      await this.aws
        .deleteObject(dto.key)
        .catch((e) => this.logger.error({ key: dto.key, err: e }, 'Failed to rollback S3 object'));
      throw err;
    }
  }

  @Post('uploads/multipart/abort')
  async abortMultipart(
    @Body() dto: MultipartKeyDto,
    @CurrentUser() user: { userId: string },
  ) {
    await this.assertUploadOwner(dto.uploadId, user.userId);
    await this.aws.abortMultipartUpload(dto.key, dto.uploadId);
    await this.redis.del(`upload:${dto.uploadId}`);
  }

  @Get(':id/status')
  getStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.photoService.getStatus(id, user.userId);
  }

  @Get()
  list(@Query() query: PhotoListQueryDto, @CurrentUser() user: { userId: string }) {
    return this.photoService.listForUser(user.userId, query);
  }
}
