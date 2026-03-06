import { createZodDto } from 'nestjs-zod';
import { UserCreateSchema } from '@repo/shared';

export class CreateUserDto extends createZodDto(UserCreateSchema) {}
