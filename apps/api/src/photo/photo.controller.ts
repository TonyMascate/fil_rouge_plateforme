import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Logger, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiExtraModels, ApiHeader, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiErrorDto } from '@app/common/dto/api-error.dto';
import {
  CreateMultipartResponseDto,
  SignPartResponseDto,
  UploadRegisteredResponseDto,
  PhotoStatusResponseDto,
  PhotoListResponseDto,
  QuotaResponseDto,
  ShareResponseDto,
} from './dto/photo-response.dto';
import { CurrentUser } from '@app/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '@app/auth/guards/jwt-auth.guard';
import { AwsService } from '@app/aws/aws.service';
import { ApiException } from '@app/common/api.exception';
import { RedisService } from '@app/redis/redis.service';
import { ErrorCode, isValidCellId } from '@repo/shared';
import { PhotoService } from './photo.service';
import { PhotoListQueryDto } from './dto/photo-list-query.dto';
import {
  CompleteMultipartDto,
  CreateMultipartDto,
  MultipartKeyDto,
  SignPartDto,
} from './dto/multipart.dto';

@ApiTags('Photos')
@ApiCookieAuth('access_token')
@ApiExtraModels(ApiErrorDto)
@ApiHeader({ name: 'X-XSRF-TOKEN', description: 'Token CSRF (valeur du cookie XSRF-TOKEN) — requis sur toutes les mutations', required: true })
@Controller('photos')
@UseGuards(JwtAuthGuard)
export class PhotoController {
  private readonly logger = new Logger(PhotoController.name);

  constructor(
    private readonly photoService: PhotoService,
    private readonly aws: AwsService,
    private readonly redis: RedisService,
  ) {}

  private async assertUploadOwner(uploadId: string, userId: string) {
    const owner = await this.redis.get(`upload:${uploadId}`);
    if (owner !== userId) {
      throw new ApiException(ErrorCode.FORBIDDEN, HttpStatus.FORBIDDEN, 'Accès refusé', []);
    }
  }

  @Post('uploads/multipart')
  @ApiOperation({ summary: 'Initialiser un upload multipart' })
  @ApiResponse({ status: 201, type: CreateMultipartResponseDto })
  @ApiResponse({ status: 400, description: 'Données invalides', type: ApiErrorDto })
  @ApiResponse({ status: 401, description: 'Non authentifié', type: ApiErrorDto })
  @ApiResponse({ status: 403, description: 'Quota de stockage atteint', type: ApiErrorDto })
  async createMultipart(
    @Body() dto: CreateMultipartDto,
    @CurrentUser() user: { userId: string },
  ) {
    const { usedBytes, maxBytes } = await this.photoService.getQuotaForUser(user.userId);
    if (usedBytes + dto.fileSize > maxBytes) {
      throw new ApiException(ErrorCode.QUOTA_EXCEEDED, HttpStatus.FORBIDDEN, 'Quota de stockage atteint', []);
    }

    const result = await this.aws.createMultipartUpload(dto.contentType);
    await this.redis.set(`upload:${result.uploadId}`, user.userId, 'EX', 3600);
    return result;
  }

  @Post('uploads/multipart/sign-part')
  @ApiOperation({ summary: 'Signer une URL PUT pour une part' })
  @ApiResponse({ status: 201, type: SignPartResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifié', type: ApiErrorDto })
  @ApiResponse({ status: 403, description: 'Upload n\'appartient pas au user', type: ApiErrorDto })
  async signPart(
    @Body() dto: SignPartDto,
    @CurrentUser() user: { userId: string },
  ) {
    await this.assertUploadOwner(dto.uploadId, user.userId);
    const url = await this.aws.signPart(dto.key, dto.uploadId, dto.partNumber);
    return { url };
  }

  @Post('uploads/multipart/list-parts')
  @HttpCode(200)
  @ApiOperation({ summary: 'Lister les parts déjà uploadées (reprise)' })
  @ApiResponse({ status: 200, schema: { type: 'array', items: { type: 'object', properties: { PartNumber: { type: 'number' }, ETag: { type: 'string' }, Size: { type: 'number' } } } } })
  @ApiResponse({ status: 401, description: 'Non authentifié', type: ApiErrorDto })
  @ApiResponse({ status: 403, description: 'Upload n\'appartient pas au user', type: ApiErrorDto })
  async listParts(
    @Body() dto: MultipartKeyDto,
    @CurrentUser() user: { userId: string },
  ) {
    await this.assertUploadOwner(dto.uploadId, user.userId);
    return this.aws.listParts(dto.key, dto.uploadId);
  }

  @Post('uploads/multipart/complete')
  @ApiOperation({ summary: 'Assembler les parts, enregistrer la photo et lancer l\'optimisation' })
  @ApiResponse({ status: 201, type: UploadRegisteredResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifié', type: ApiErrorDto })
  @ApiResponse({ status: 403, description: 'Upload n\'appartient pas au user', type: ApiErrorDto })
  @ApiResponse({ status: 404, description: 'Fichier introuvable sur S3 après assemblage', type: ApiErrorDto })
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
  @HttpCode(204)
  @ApiOperation({ summary: 'Annuler un upload en cours' })
  @ApiResponse({ status: 204, description: 'Upload annulé' })
  @ApiResponse({ status: 401, description: 'Non authentifié', type: ApiErrorDto })
  @ApiResponse({ status: 403, description: 'Upload n\'appartient pas au user', type: ApiErrorDto })
  async abortMultipart(
    @Body() dto: MultipartKeyDto,
    @CurrentUser() user: { userId: string },
  ) {
    await this.assertUploadOwner(dto.uploadId, user.userId);
    await this.aws.abortMultipartUpload(dto.key, dto.uploadId);
    await this.redis.del(`upload:${dto.uploadId}`);
  }

  @Get('quota')
  @ApiOperation({ summary: 'Quota de stockage de l\'utilisateur connecté' })
  @ApiResponse({ status: 200, type: QuotaResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifié', type: ApiErrorDto })
  getQuota(@CurrentUser() user: { userId: string }): Promise<QuotaResponseDto> {
    return this.photoService.getQuotaForUser(user.userId);
  }

  @Get('colors')
  @ApiOperation({ summary: 'Exploration chromatique — atlas de couleurs avec le nombre de photos par cellule' })
  @ApiQuery({ name: 'albumId', required: false, type: String, format: 'uuid', description: 'Restreint l\'atlas à un album' })
  @ApiResponse({ status: 200, description: 'Grille fixe de cellules couleur, chacune avec son count' })
  @ApiResponse({ status: 401, description: 'Non authentifié', type: ApiErrorDto })
  getColorAtlas(
    @CurrentUser() user: { userId: string },
    @Query('albumId', new ParseUUIDPipe({ optional: true })) albumId?: string,
  ) {
    return this.photoService.getColorAtlas(user.userId, albumId);
  }

  @Get('colors/:cellId')
  @ApiOperation({ summary: 'Photos d\'une cellule de l\'atlas (paginées)' })
  @ApiParam({ name: 'cellId', type: String, example: 'c-8-2' })
  @ApiQuery({ name: 'albumId', required: false, type: String, format: 'uuid', description: 'Restreint la cellule à un album' })
  @ApiResponse({ status: 200, description: 'Photos de la cellule, paginées' })
  @ApiResponse({ status: 400, description: 'cellId inconnu', type: ApiErrorDto })
  @ApiResponse({ status: 401, description: 'Non authentifié', type: ApiErrorDto })
  getColorCellPhotos(
    @Param('cellId') cellId: string,
    @Query() query: PhotoListQueryDto,
    @CurrentUser() user: { userId: string },
    @Query('albumId', new ParseUUIDPipe({ optional: true })) albumId?: string,
  ) {
    if (!isValidCellId(cellId)) {
      throw new ApiException(ErrorCode.VALIDATION_ERROR, HttpStatus.BAD_REQUEST, 'Cellule couleur inconnue', []);
    }
    return this.photoService.listByCell(user.userId, cellId, query, albumId);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Statut de traitement d\'une photo' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 200, type: PhotoStatusResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifié', type: ApiErrorDto })
  @ApiResponse({ status: 404, description: 'Photo introuvable ou accès refusé', type: ApiErrorDto })
  getStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.photoService.getStatus(id, user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Liste paginée des photos COMPLETED du user' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, type: PhotoListResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifié', type: ApiErrorDto })
  list(@Query() query: PhotoListQueryDto, @CurrentUser() user: { userId: string }) {
    return this.photoService.listForUser(user.userId, query);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Supprimer une photo (objet S3 + ligne DB)' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Photo supprimée' })
  @ApiResponse({ status: 401, description: 'Non authentifié', type: ApiErrorDto })
  @ApiResponse({ status: 404, description: 'Photo introuvable ou accès refusé', type: ApiErrorDto })
  deletePhoto(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: { userId: string }) {
    return this.photoService.deletePhoto(id, user.userId);
  }

  @Post(':id/share')
  @ApiOperation({ summary: 'Activer le partage public (génère un lien révocable)' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 201, type: ShareResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifié', type: ApiErrorDto })
  @ApiResponse({ status: 404, description: 'Photo introuvable ou accès refusé', type: ApiErrorDto })
  sharePhoto(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: { userId: string }) {
    return this.photoService.sharePhoto(id, user.userId);
  }

  @Delete(':id/share')
  @HttpCode(204)
  @ApiOperation({ summary: 'Désactiver le partage public (repasser en privé)' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Partage désactivé' })
  @ApiResponse({ status: 401, description: 'Non authentifié', type: ApiErrorDto })
  @ApiResponse({ status: 404, description: 'Photo introuvable ou accès refusé', type: ApiErrorDto })
  unsharePhoto(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: { userId: string }) {
    return this.photoService.unsharePhoto(id, user.userId);
  }
}
