import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiExtraModels, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '@app/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@app/auth/guards/roles.guard';
import { Roles } from '@app/auth/decorators/roles.decorator';
import { CurrentUser } from '@app/auth/decorators/current-user.decorator';
import { Role } from '@repo/shared';
import { UserResponseDto } from './dto/user-response.dto';
import { ApiErrorDto } from '@app/common/dto/api-error.dto';

@ApiTags('Users')
@ApiCookieAuth('access_token')
@ApiExtraModels(ApiErrorDto)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('admin-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Données réservées aux admins' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 401, description: 'Non authentifié', type: ApiErrorDto })
  @ApiResponse({ status: 403, description: 'Rôle insuffisant', type: ApiErrorDto })
  getAdminData() {
    return { message: 'Données réservées aux administrateurs' };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Profil de l'utilisateur connecté" })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 401, description: 'Non authentifié', type: ApiErrorDto })
  getProfile(@CurrentUser() user: { userId: string; role: string; email: string }) {
    return this.usersService.getProfile(user.userId);
  }

  findAll() {
    return this.usersService.findAll();
  }
}
