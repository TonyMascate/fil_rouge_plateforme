import { createZodDto } from 'nestjs-zod';
import { UserCreateSchema } from '@repo/shared/user';

export class CreateUserDto extends createZodDto(UserCreateSchema) {}
