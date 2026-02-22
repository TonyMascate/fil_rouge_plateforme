import { UserLoginSchema } from '@repo/shared/user';
import { createZodDto } from 'nestjs-zod';

export class LoginUserDto extends createZodDto(UserLoginSchema) {}
