import { createZodDto } from 'nestjs-zod';
import {
  CompleteMultipartSchema,
  CreateMultipartSchema,
  MultipartKeySchema,
  SignPartSchema,
} from '@repo/shared';

export class CreateMultipartDto extends createZodDto(CreateMultipartSchema) {}
export class SignPartDto extends createZodDto(SignPartSchema) {}
export class MultipartKeyDto extends createZodDto(MultipartKeySchema) {}
export class CompleteMultipartDto extends createZodDto(CompleteMultipartSchema) {}
