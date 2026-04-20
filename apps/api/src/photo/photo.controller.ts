import { Body, Controller, Get, Logger, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';

import { CurrentUser } from '@app/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '@app/auth/guards/jwt-auth.guard';
import { AwsService } from '@app/aws/aws.service';
import { PhotoService } from './photo.service';
import { PhotoListQueryDto } from './dto/photo-list-query.dto';
import { CompleteMultipartDto, CreateMultipartDto, MultipartKeyDto, SignPartDto } from './dto/multipart.dto';

@Controller('photos')
@UseGuards(JwtAuthGuard)
export class PhotoController {
  private readonly logger = new Logger(PhotoController.name);

  constructor(
    private readonly photoService: PhotoService,
    private readonly aws: AwsService,
  ) {}

  // --- Multipart upload (appelé par Uppy côté front) ---

  @Post('uploads/multipart')
  createMultipart(@Body() dto: CreateMultipartDto) {
    return this.aws.createMultipartUpload(dto.filename, dto.contentType);
  }

  @Post('uploads/multipart/sign-part')
  async signPart(@Body() dto: SignPartDto) {
    const url = await this.aws.signPart(dto.key, dto.uploadId, dto.partNumber);
    return { url };
  }

  @Post('uploads/multipart/list-parts')
  listParts(@Body() dto: MultipartKeyDto) {
    return this.aws.listParts(dto.key, dto.uploadId);
  }

  // Fusionne : 1) complete multipart côté S3  2) INSERT photo  3) enqueue job
  // Si (2) ou (3) fail, on DeleteObject pour éviter les orphelins S3.
  @Post('uploads/multipart/complete')
  async completeMultipart(@Body() dto: CompleteMultipartDto, @CurrentUser() user: { userId: string }) {
    await this.aws.completeMultipartUpload(dto.key, dto.uploadId, dto.parts);

    try {
      return await this.photoService.registerUpload({ key: dto.key, originalName: dto.originalName }, user.userId);
    } catch (err) {
      await this.aws
        .deleteObject(dto.key)
        .catch((e) => this.logger.error({ key: dto.key, err: e }, 'Failed to rollback S3 object'));
      throw err;
    }
  }

  @Post('uploads/multipart/abort')
  abortMultipart(@Body() dto: MultipartKeyDto) {
    return this.aws.abortMultipartUpload(dto.key, dto.uploadId);
  }

  @Get(':id/status')
  getStatus(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: { userId: string }) {
    return this.photoService.getStatus(id, user.userId);
  }

  @Get()
  list(@Query() query: PhotoListQueryDto, @CurrentUser() user: { userId: string }) {
    return this.photoService.listForUser(user.userId, query);
  }
}
