import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ErrorCode, PhotoStatus } from '@repo/shared';
import { ApiException } from '@app/common/api.exception';
import { AwsService } from '@app/aws/aws.service';
import { Photo } from '@app/photo/entities/photo.entity';
import { User } from '@app/users/entities/user.entity';
import { Album } from './entities/album.entity';
import { AlbumPhoto } from './entities/album-photo.entity';
import { AlbumMember } from './entities/album-member.entity';
import { CreateAlbumDto, UpdateAlbumDto, MemberDto, AlbumResponseDto } from './dto/album.dto';
import { PhotoListQueryDto } from '@app/photo/dto/photo-list-query.dto';

interface MemberRow extends MemberDto {
  albumId: string;
}

@Injectable()
export class AlbumService {
  constructor(
    @InjectRepository(Album) private readonly albumRepo: Repository<Album>,
    @InjectRepository(AlbumPhoto) private readonly albumPhotoRepo: Repository<AlbumPhoto>,
    @InjectRepository(AlbumMember) private readonly albumMemberRepo: Repository<AlbumMember>,
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

  // ─── Requêtes batch (évite le N+1) ───────────────────────────────────────

  /** Covers : top 4 photos par album via une seule fenêtre ROW_NUMBER */
  private async getCoversForAlbums(albumIds: string[]): Promise<Map<string, string[]>> {
    if (albumIds.length === 0) return new Map();
    const rows = await this.albumPhotoRepo.manager.query<{ albumId: string; s3Key: string }[]>(
      // Tiebreaker `photo_id DESC` : garantit un ordre stable si deux photos partagent
      // le même added_at (bulk insert) → covers identiques entre deux rafraîchissements.
      `SELECT album_id AS "albumId", s3_key AS "s3Key"
       FROM (
         SELECT ap.album_id, p.s3_key,
                ROW_NUMBER() OVER (
                  PARTITION BY ap.album_id
                  ORDER BY ap.added_at DESC, ap.photo_id DESC
                ) AS rn
         FROM album_photos ap
         INNER JOIN photos p ON p.id = ap.photo_id
         WHERE ap.album_id = ANY($1) AND p.status = $2
       ) ranked
       WHERE rn <= 4`,
      [albumIds, PhotoStatus.COMPLETED],
    );
    const map = new Map<string, string[]>();
    for (const row of rows) {
      const list = map.get(row.albumId) ?? [];
      list.push(this.aws.getSignedImageUrl(row.s3Key));
      map.set(row.albumId, list);
    }
    return map;
  }

  /** Membres : tous les membres pour un ensemble d'albums en une seule requête */
  private async getMembersForAlbums(albumIds: string[]): Promise<MemberRow[]> {
    if (albumIds.length === 0) return [];
    return this.albumMemberRepo
      .createQueryBuilder('am')
      .innerJoin('am.user', 'u')
      .select([
        'am.albumId AS "albumId"',
        'am.userId AS "id"',
        'u.email AS email',
        'u.firstName AS "firstName"',
        'u.lastName AS "lastName"',
      ])
      .where('am.albumId IN (:...albumIds)', { albumIds })
      .getRawMany<MemberRow>();
  }

  /** Covers : top 4 pour un album unique */
  private async getCoversForAlbum(albumId: string): Promise<string[]> {
    const map = await this.getCoversForAlbums([albumId]);
    return map.get(albumId) ?? [];
  }

  // ─── Formatage ────────────────────────────────────────────────────────────

  /** Format complet d'un album unique (utilisé après create/update) */
  private async formatSingle(album: Album, userId: string): Promise<AlbumResponseDto> {
    const isOwner = album.userId === userId;
    const [photoCount, covers, memberRows] = await Promise.all([
      this.albumPhotoRepo.count({ where: { albumId: album.id } }),
      this.getCoversForAlbum(album.id),
      isOwner ? this.getMembersForAlbums([album.id]) : Promise.resolve([]),
    ]);
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

  /** Retourne uniquement les IDs des photos d'un album (pour filtrage côté client) */
  async getPhotoIds(albumId: string, userId: string): Promise<string[]> {
    await this.assertAccess(albumId, userId);
    const rows = await this.albumPhotoRepo.find({
      where: { albumId },
      select: ['photoId'],
    });
    return rows.map((r) => r.photoId);
  }

  /** Liste tous les albums (propriétaire + partagés) en 4 requêtes quelque soit le nombre */
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
    // Tri final par date de création de l'album : owned + shared dans le même ordre cohérent
    const all = [...ownedAlbums, ...sharedAlbums].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    if (all.length === 0) return [];

    const albumIds = all.map((a) => a.id);
    const ownedIds = ownedAlbums.map((a) => a.id);

    const [countRows, coversMap, memberRows] = await Promise.all([
      this.albumPhotoRepo
        .createQueryBuilder('ap')
        .select('ap.albumId', 'albumId')
        .addSelect('COUNT(*)', 'count')
        .where('ap.albumId IN (:...albumIds)', { albumIds })
        .groupBy('ap.albumId')
        .getRawMany<{ albumId: string; count: string }>(),
      this.getCoversForAlbums(albumIds),
      this.getMembersForAlbums(ownedIds),
    ]);

    const countMap = new Map(countRows.map((r) => [r.albumId, parseInt(r.count, 10)]));
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
    const { page, limit, order } = query;

    const [rows, total] = await this.albumPhotoRepo
      .createQueryBuilder('ap')
      .innerJoinAndSelect('ap.photo', 'p')
      .where('ap.albumId = :albumId', { albumId })
      .andWhere('p.status = :status', { status: PhotoStatus.COMPLETED })
      .orderBy('ap.addedAt', order === 'asc' ? 'ASC' : 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

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

  // TODO : Vérifier exactement ce qu'il se passe en cas de doublon d'ajout
  async addPhotos(albumId: string, photoIds: string[], userId: string): Promise<void> {
    await this.assertOwner(albumId, userId);

    // Rejet immédiat dès qu'au moins une photo est déjà dans l'album.
    // Côté client, PickPhotosModal filtre les photos déjà présentes avant l'appel.
    // L'erreur protège le cas "Ajouter à un album" depuis le détail d'une photo
    // (ou depuis la sélection galerie) où aucun filtrage préventif n'est fait.
    const existingCount = await this.albumPhotoRepo.count({
      where: { albumId, photoId: In(photoIds) },
    });
    if (existingCount > 0) {
      throw new ApiException(
        ErrorCode.ALBUM_PHOTO_ALREADY_EXISTS,
        HttpStatus.CONFLICT,
        existingCount > 1
          ? `${existingCount} photos sont déjà dans cet album`
          : 'Cette photo est déjà dans l\'album',
        [],
      );
    }

    const photos = await this.photoRepo.find({
      where: { id: In(photoIds), userId, status: PhotoStatus.COMPLETED },
    });
    const validIds = photos.map((p) => p.id);
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
    const rows = await this.getMembersForAlbums([album.id]);
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
