import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Role } from '@repo/shared';

// Swagger-only schema : z.date() remplacé par z.string() (bug ouvert nestjs-zod#184)
const UserResponseSwaggerSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  firstName: z.string(),
  lastName: z.string(),
  role: z.enum([Role.USER, Role.ADMIN]),
  createdAt: z.string().describe('ISO 8601 datetime'),
});

export class UserResponseDto extends createZodDto(UserResponseSwaggerSchema) {}
