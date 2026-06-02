import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';

import { AwsModule } from '@app/aws/aws.module';
import { PhotoController } from './photo.controller';
import { PublicPhotoController } from './public-photo.controller';
import { PhotoService } from './photo.service';
import { PhotoProcessor } from './photo.processor';
import { PhotoRepository } from './repositories/photo.repository';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'image-queue' }),
    AwsModule,
  ],
  controllers: [PhotoController, PublicPhotoController],
  providers: [PhotoService, PhotoProcessor, PhotoRepository],
})
export class PhotoModule {}
