import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AwsModule } from '@app/aws/aws.module';
import { Photo } from '@app/photo/entities/photo.entity';
import { User } from '@app/users/entities/user.entity';
import { Album } from './entities/album.entity';
import { AlbumPhoto } from './entities/album-photo.entity';
import { AlbumMember } from './entities/album-member.entity';
import { AlbumService } from './album.service';
import { AlbumController } from './album.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Album, AlbumPhoto, AlbumMember, Photo, User]),
    AwsModule,
  ],
  controllers: [AlbumController],
  providers: [AlbumService],
})
export class AlbumModule {}
