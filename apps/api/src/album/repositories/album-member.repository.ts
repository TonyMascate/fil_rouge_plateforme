import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { MemberDto } from '../dto/album.dto';
import { AlbumMember } from '../entities/album-member.entity';

export interface MemberRow extends MemberDto {
  albumId: string;
}

@Injectable()
export class AlbumMemberRepository extends Repository<AlbumMember> {
  constructor(dataSource: DataSource) {
    super(AlbumMember, dataSource.createEntityManager());
  }

  async getMembersForAlbums(albumIds: string[]): Promise<MemberRow[]> {
    if (albumIds.length === 0) return [];
    return this.createQueryBuilder('am')
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
}
