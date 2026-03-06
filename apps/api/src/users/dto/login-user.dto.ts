import { UserLoginSchema } from '@repo/shared';
import { createZodDto } from 'nestjs-zod';

export class LoginUserDto extends createZodDto(UserLoginSchema) {}
