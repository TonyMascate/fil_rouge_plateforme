import { createZodDto } from 'nestjs-zod';
import { PhotoListQuerySchema } from '@repo/shared';

export class PhotoListQueryDto extends createZodDto(PhotoListQuerySchema) {}
