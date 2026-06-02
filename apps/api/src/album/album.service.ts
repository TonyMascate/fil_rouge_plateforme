import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ErrorCode, PhotoStatus } from '@repo/shared';
import { ApiException } from '@app/common/api.exception';
import { AwsService } from '@app/aws/aws.service';
import { Photo } from '@app/photo/entities/photo.entity';
import { User } from '@app/users/entities/user.entity';
import { Album } from './entities/album.entity';
import { AlbumPhotoRepository } from './repositories/album-photo.repository';
import { AlbumMemberRepository } from './repositories/album-member.repository';
import { CreateAlbumDto, UpdateAlbumDto, MemberDto, AlbumResponseDto } from './dto/album.dto';
import { PhotoListQueryDto } from '@app/photo/dto/photo-list-query.dto';

@Injectable()
export class AlbumService {
  constructor(
    @InjectRepository(Album) private readonly albumRepo: Repository<Album>,
    private readonly albumPhotoRepo: AlbumPhotoRepository,
    private readonly albumMemberRepo: AlbumMemberRepository,
    @InjectRepository(Photo) private readonly photoRepo: Repository<Photo>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly aws: AwsService,
  ) {}

  // ─── Helpers d'autorisation ───────────────────────────────────────────────

  private throwNotFound(): never {
    throw new ApiException(ErrorCode.ALBUM_NOT_FOUND, HttpStatus.NOT_FOUND, 'Album introuvable', []);
  }

  private throwForbidden(): never {
    throw new ApiException(ErrorCode.FORBIDDEN, HttpStatus.FORBIDDEN, 'Accès refusé', []);
  }

  private async findAlbum(id: string): Promise<Album> {
    const album = await this.albumRepo.findOne({ where: { id } });
    if (!album) this.throwNotFound();
    return album;
  }

  private async assertOwner(albumId: string, userId: string): Promise<Album> {
    const album = await this.findAlbum(albumId);
    if (album.userId !== userId) this.throwForbidden();
    return album;
  }

  private async assertAccess(albumId: string, userId: string): Promise<Album> {
    const album = await this.findAlbum(albumId);
    if (album.userId === userId) return album;
    const member = await this.albumMemberRepo.findOne({ where: { albumId, userId } });
    if (!member) this.throwForbidden();
    return album;
  }

  // ─── Helpers URL ──────────────────────────────────────────────────────────

  private toUrlMap(s3Map: Map<string, string[]>): Map<string, string[]> {
    const urlMap = new Map<string, string[]>();
    for (const [albumId, keys] of s3Map) {
      urlMap.set(albumId, keys.map((key) => this.aws.getSignedImageUrl(key)));
    }
    return urlMap;
  }

  // ─── Formatage ────────────────────────────────────────────────────────────

  private async formatSingle(album: Album, userId: string): Promise<AlbumResponseDto> {
    const isOwner = album.userId === userId;
    const [photoCount, s3Map, memberRows] = await Promise.all([
      this.albumPhotoRepo.count({ where: { albumId: album.id } }),
      this.albumPhotoRepo.getCoversS3KeysForAlbums([album.id]),
      isOwner ? this.albumMemberRepo.getMembersForAlbums([album.id]) : Promise.resolve([]),
    ]);
    const covers = (s3Map.get(album.id) ?? []).map((key) => this.aws.getSignedImageUrl(key));
    return {
      id: album.id,
      name: album.name,
      photoCount,
      covers,
      isOwner,
      ownerId: album.userId,
      members: memberRows.map(({ albumId: _albumId, ...m }) => m),
      createdAt: album.createdAt,
      updatedAt: album.updatedAt,
    };
  }

  // ─── Méthodes publiques ───────────────────────────────────────────────────

  async findOne(id: string, userId: string): Promise<AlbumResponseDto> {
    const album = await this.assertAccess(id, userId);
    return this.formatSingle(album, userId);
  }

  async getPhotoIds(albumId: string, userId: string): Promise<string[]> {
    await this.assertAccess(albumId, userId);
    return this.albumPhotoRepo.findPhotoIds(albumId);
  }

  async findAllForUser(userId: string): Promise<AlbumResponseDto[]> {
    const [ownedAlbums, memberships] = await Promise.all([
      this.albumRepo.find({ where: { userId }, order: { createdAt: 'DESC' } }),
      this.albumMemberRepo.find({
        where: { userId },
        relations: ['album'],
        order: { createdAt: 'DESC' },
      }),
    ]);

    const sharedAlbums = memberships.map((m) => m.album).filter(Boolean);
    const all = [...ownedAlbums, ...sharedAlbums].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    if (all.length === 0) return [];

    const albumIds = all.map((album) => album.id);
    const ownedIds = ownedAlbums.map((album) => album.id);

    const [countMap, s3Map, memberRows] = await Promise.all([
      this.albumPhotoRepo.countByAlbumIds(albumIds),
      this.albumPhotoRepo.getCoversS3KeysForAlbums(albumIds),
      this.albumMemberRepo.getMembersForAlbums(ownedIds),
    ]);

    const coversMap = this.toUrlMap(s3Map);
    const membersMap = new Map<string, MemberDto[]>();
    for (const { albumId, ...member } of memberRows) {
      const list = membersMap.get(albumId) ?? [];
      list.push(member);
      membersMap.set(albumId, list);
    }

    return all.map((album) => ({
      id: album.id,
      name: album.name,
      photoCount: countMap.get(album.id) ?? 0,
      covers: coversMap.get(album.id) ?? [],
      isOwner: album.userId === userId,
      ownerId: album.userId,
      members: membersMap.get(album.id) ?? [],
      createdAt: album.createdAt,
      updatedAt: album.updatedAt,
    }));
  }

  async create(dto: CreateAlbumDto, userId: string): Promise<AlbumResponseDto> {
    const album = await this.albumRepo.save({ name: dto.name, userId });
    return {
      id: album.id,
      name: album.name,
      photoCount: 0,
      covers: [],
      isOwner: true,
      ownerId: userId,
      members: [],
      createdAt: album.createdAt,
      updatedAt: album.updatedAt,
    };
  }

  async update(id: string, dto: UpdateAlbumDto, userId: string): Promise<AlbumResponseDto> {
    const album = await this.assertOwner(id, userId);
    album.name = dto.name;
    const saved = await this.albumRepo.save(album);
    return this.formatSingle(saved, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.assertOwner(id, userId);
    await this.albumRepo.delete(id);
  }

  async getPhotos(albumId: string, userId: string, query: PhotoListQueryDto) {
    await this.assertAccess(albumId, userId);
    const [rows, total] = await this.albumPhotoRepo.findPhotosPage(albumId, query);
    const { page, limit } = query;
    return {
      items: rows.map(({ photo }) => ({
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

  async addPhotos(albumId: string, photoIds: string[], userId: string): Promise<void> {
    await this.assertOwner(albumId, userId);

    const existingCount = await this.albumPhotoRepo.count({
      where: { albumId, photoId: In(photoIds) },
    });
    if (existingCount > 0) {
      throw new ApiException(
        ErrorCode.ALBUM_PHOTO_ALREADY_EXISTS,
        HttpStatus.CONFLICT,
        existingCount > 1
          ? `${existingCount} photos sont déjà dans cet album`
          : "Cette photo est déjà dans l'album",
        [],
      );
    }

    const photos = await this.photoRepo.find({
      where: { id: In(photoIds), userId, status: PhotoStatus.COMPLETED },
    });
    const validIds = photos.map((photo) => photo.id);
    if (validIds.length > 0) {
      await this.albumPhotoRepo.insert(validIds.map((photoId) => ({ albumId, photoId })));
    }
  }

  async removePhoto(albumId: string, photoId: string, userId: string): Promise<void> {
    await this.assertOwner(albumId, userId);
    await this.albumPhotoRepo.delete({ albumId, photoId });
  }

  async getMembers(albumId: string, userId: string): Promise<MemberDto[]> {
    const album = await this.assertOwner(albumId, userId);
    const rows = await this.albumMemberRepo.getMembersForAlbums([album.id]);
    return rows.map(({ albumId: _albumId, ...m }) => m);
  }

  async addMember(albumId: string, email: string, userId: string): Promise<MemberDto> {
    await this.assertOwner(albumId, userId);

    const target = await this.userRepo.findOne({ where: { email } });
    if (!target) {
      throw new ApiException(
        ErrorCode.USER_NOT_FOUND,
        HttpStatus.NOT_FOUND,
        'Aucun utilisateur trouvé avec cet email',
        [],
      );
    }
    if (target.id === userId) {
      throw new ApiException(
        ErrorCode.VALIDATION_ERROR,
        HttpStatus.UNPROCESSABLE_ENTITY,
        "Vous ne pouvez pas partager l'album avec vous-même",
        [],
      );
    }

    const existing = await this.albumMemberRepo.findOne({ where: { albumId, userId: target.id } });
    if (!existing) {
      await this.albumMemberRepo.insert({ albumId, userId: target.id });
    }

    return { id: target.id, email: target.email, firstName: target.firstName, lastName: target.lastName };
  }

  async removeMember(albumId: string, memberId: string, userId: string): Promise<void> {
    await this.assertOwner(albumId, userId);
    await this.albumMemberRepo.delete({ albumId, userId: memberId });
  }
}
