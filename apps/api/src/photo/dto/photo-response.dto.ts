import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  CreateMultipartResponseSchema,
  SignPartResponseSchema,
  UploadRegisteredResponseSchema,
  PhotoStatusResponseSchema,
  QuotaResponseSchema,
} from '@repo/shared';

// Schemas sans dates → import direct depuis @repo/shared
export class CreateMultipartResponseDto extends createZodDto(CreateMultipartResponseSchema) {}
export class SignPartResponseDto extends createZodDto(SignPartResponseSchema) {}
export class UploadRegisteredResponseDto extends createZodDto(UploadRegisteredResponseSchema) {}
export class PhotoStatusResponseDto extends createZodDto(PhotoStatusResponseSchema) {}
export class QuotaResponseDto extends createZodDto(QuotaResponseSchema) {}

// Schemas avec dates → redéfinis localement avec z.string() pour Swagger
// (z.date() non représentable en JSON Schema — bug ouvert nestjs-zod#184)
const PhotoListResponseSwaggerSchema = z.object({
  items: z.array(z.object({
    id: z.string().uuid(),
    url: z.string().url(),
    originalName: z.string(),
    createdAt: z.string().describe('ISO 8601 datetime'),
  })),
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});
export class PhotoListResponseDto extends createZodDto(PhotoListResponseSwaggerSchema) {}
