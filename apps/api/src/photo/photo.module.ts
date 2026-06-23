import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { AwsModule } from '@app/aws/aws.module';
import { PhotoController } from './photo.controller';
import { PublicPhotoController } from './public-photo.controller';
import { PhotoService } from './photo.service';
import { PhotoProcessor } from './photo.processor';
import { PhotoRepository } from './repositories/photo.repository';
import { AlbumPhotoRepository } from '@app/album/repositories/album-photo.repository';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'image-queue' }),
    AwsModule,
  ],
  controllers: [PhotoController, PublicPhotoController],
  // AlbumPhotoRepository ne dépend que de DataSource : on le fournit ici pour
  // l'exploration chromatique filtrée par album, sans coupler les modules.
  providers: [PhotoService, PhotoProcessor, PhotoRepository, AlbumPhotoRepository],
})
export class PhotoModule {}
