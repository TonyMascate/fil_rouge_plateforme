import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';

import { AwsModule } from '@app/aws/aws.module';
import { Photo } from './entities/photo.entity';
import { PhotoController } from './photo.controller';
import { PhotoService } from './photo.service';
import { PhotoProcessor } from './photo.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([Photo]),
    BullModule.registerQueue({ name: 'image-queue' }),
    AwsModule,
  ],
  controllers: [PhotoController],
  providers: [PhotoService, PhotoProcessor],
})
export class PhotoModule {}
