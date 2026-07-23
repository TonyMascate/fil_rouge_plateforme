import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiHeader, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@app/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@app/auth/decorators/current-user.decorator';
import { PhotoListQueryDto } from '@app/photo/dto/photo-list-query.dto';
import { AlbumService } from './album.service';
import { AddMemberDto, AddPhotosDto, CreateAlbumDto, UpdateAlbumDto } from './dto/album.dto';

@ApiTags('Albums')
@ApiCookieAuth('access_token')
@ApiHeader({ name: 'X-XSRF-TOKEN', description: 'Token CSRF', required: true })
@Controller('albums')
@UseGuards(JwtAuthGuard)
export class AlbumController {
  constructor(private readonly albumService: AlbumService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les albums (propriétaire + partagés avec moi)' })
  findAll(@CurrentUser() user: { userId: string }) {
    return this.albumService.findAllForUser(user.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Créer un album' })
  create(@Body() dto: CreateAlbumDto, @CurrentUser() user: { userId: string }) {
    return this.albumService.create(dto, user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un album par son id' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: { userId: string }) {
    return this.albumService.findOne(id, user.userId);
  }

  @Get(':id/photo-ids')
  @ApiOperation({ summary: "Récupérer les IDs des photos d'un album" })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  getPhotoIds(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: { userId: string }) {
    return this.albumService.getPhotoIds(id, user.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Renommer un album' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAlbumDto, @CurrentUser() user: { userId: string }) {
    return this.albumService.update(id, dto, user.userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un album' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: { userId: string }) {
    return this.albumService.remove(id, user.userId);
  }

  @Get(':id/photos')
  @ApiOperation({ summary: "Lister les photos d'un album (paginé)" })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  getPhotos(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PhotoListQueryDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.albumService.getPhotos(id, user.userId, query);
  }

  @Post(':id/photos')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Ajouter des photos à un album' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  addPhotos(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddPhotosDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.albumService.addPhotos(id, dto.photoIds, user.userId);
  }

  @Delete(':id/photos/:photoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Retirer une photo d'un album" })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiParam({ name: 'photoId', type: String, format: 'uuid' })
  removePhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('photoId', ParseUUIDPipe) photoId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.albumService.removePhoto(id, photoId, user.userId);
  }

  @Get(':id/members')
  @ApiOperation({ summary: "Lister les membres d'un album" })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  getMembers(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: { userId: string }) {
    return this.albumService.getMembers(id, user.userId);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Partager un album avec un utilisateur (par email)' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddMemberDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.albumService.addMember(id, dto.email, user.userId);
  }

  @Delete(':id/members/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Retirer un membre d'un album" })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiParam({ name: 'memberId', type: String, format: 'uuid' })
  removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.albumService.removeMember(id, memberId, user.userId);
  }
}
