import { SetMetadata } from '@nestjs/common';
import { Role } from '@repo/shared';

export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);
