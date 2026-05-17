import { createZodDto } from 'nestjs-zod';
import { ApiErrorSchema } from '@repo/shared';

export class ApiErrorDto extends createZodDto(ApiErrorSchema) {}
