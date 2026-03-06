import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import type { Request } from 'express';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { Role } from '@repo/shared';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('admin-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  getAdminData() {
    return { message: 'Données réservées aux administrateurs' };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: { userId: string; role: string; email: string }) {
    return this.usersService.getProfile(user.userId);
  }

  findAll() {
    return this.usersService.findAll();
  }
}
