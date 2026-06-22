import { Body, Controller, HttpStatus, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { ApiBody, ApiExtraModels, ApiOperation, ApiResponse, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { UserResponseDto } from '@app/users/dto/user-response.dto';
import { ApiErrorDto } from '@app/common/dto/api-error.dto';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import ms, { StringValue } from 'ms';
import { v4 as uuidv4 } from 'uuid';
import { SkipCsrf } from './decorators/skip-csrf.decorator';
import { LoginUserDto } from '@app/users/dto/login-user.dto';
import { ErrorCode } from '@repo/shared';
import { ApiException } from '@app/common/api.exception';
import { CreateUserDto } from '@app/users/dto/create-user.dto';
import { UsersService } from '@app/users/users.service';

@ApiTags('Auth')
@ApiExtraModels(UserResponseDto, ApiErrorDto)
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private usersService: UsersService,
    private configService: ConfigService,
  ) {}

  // rotateCsrf : à false sur le refresh. Régénérer le cookie XSRF-TOKEN à chaque
  // refresh désynchronise toutes les requêtes concurrentes en vol (le header
  // X-XSRF-TOKEN qu'elles ont capturé ne correspond plus au nouveau cookie),
  // ce qui provoque une cascade d'échecs CSRF pendant les uploads multiples.
  private setCookies(res: Response, accesToken: string, refreshToken: string, rotateCsrf = true) {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    const opts = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      path: '/',
      ...(isProduction && { domain: this.configService.get('COOKIE_DOMAIN') }),
    };

    res.cookie('access_token', accesToken, {
      ...opts,
      maxAge: ms(this.configService.getOrThrow<StringValue>('JWT_ACCESS_EXPIRES_IN')),
    });

    res.cookie('refresh_token', refreshToken, {
      ...opts,
      maxAge: ms(this.configService.getOrThrow<StringValue>('JWT_REFRESH_EXPIRES_IN')),
    });

    if (rotateCsrf) {
      res.cookie('XSRF-TOKEN', uuidv4(), {
        ...opts,
        httpOnly: false,
      });
    }
  }

  @Post('register')
  @SkipCsrf()
  @ApiOperation({ summary: 'Créer un compte' })
  @ApiBody({ type: CreateUserDto, examples: { default: { value: { email: 'user@example.com', password: 'Password123', firstName: 'Jean', lastName: 'Dupont' } } } })
  @ApiResponse({ status: 201, schema: { properties: { user: { $ref: getSchemaPath(UserResponseDto) } } } })
  @ApiResponse({ status: 400, description: 'Données invalides', type: ApiErrorDto })
  @ApiResponse({ status: 409, description: 'Email déjà utilisé', type: ApiErrorDto })
  async register(@Body() createUserDto: CreateUserDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.usersService.create(createUserDto);
    const { accessToken, refreshToken } = await this.authService.login(user);
    this.setCookies(res, accessToken, refreshToken);
    return { user };
  }

  @Post('login')
  @SkipCsrf()
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Se connecter' })
  @ApiBody({ type: LoginUserDto, examples: { default: { value: { email: 'user@example.com', password: 'Password123' } } } })
  @ApiResponse({ status: 200, schema: { properties: { user: { $ref: getSchemaPath(UserResponseDto) } } } })
  @ApiResponse({ status: 401, description: 'Email ou mot de passe invalide', type: ApiErrorDto })
  @ApiResponse({ status: 429, description: 'Trop de tentatives', type: ApiErrorDto })
  async login(@Body() loginUserDto: LoginUserDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.authService.validateUser(loginUserDto);
    if (!user) {
      throw new ApiException(
        ErrorCode.AUTH_INVALID_CREDENTIALS,
        HttpStatus.UNAUTHORIZED,
        'Email ou mot de passe invalide',
        [],
      );
    }
    const { accessToken, refreshToken } = await this.authService.login(user);
    this.setCookies(res, accessToken, refreshToken);
    return { user };
  }

  @Post('refresh')
  @SkipCsrf()
  @ApiOperation({ summary: 'Renouveler les tokens via cookie refresh_token' })
  @ApiResponse({ status: 200, schema: { properties: { message: { type: 'string', example: 'Refreshed' } } } })
  @ApiResponse({ status: 401, description: 'Refresh token absent ou invalide', type: ApiErrorDto })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies['refresh_token'];
    if (!refreshToken) {
      throw new UnauthorizedException();
    }
    const { accessToken, refreshToken: newRefreshToken } = await this.authService.refreshTokens(refreshToken);
    this.setCookies(res, accessToken, newRefreshToken, false);
    return { message: 'Refreshed' };
  }

  @Post('logout')
  @SkipCsrf()
  @ApiOperation({ summary: 'Se déconnecter' })
  @ApiResponse({ status: 200, schema: { properties: { message: { type: 'string', example: 'Logged out' } } } })
  async logout(@Res({ passthrough: true }) res: Response) {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    const clearOpts = {
      path: '/',
      ...(isProduction && { domain: this.configService.get('COOKIE_DOMAIN') }),
    };
    res.clearCookie('access_token', clearOpts);
    res.clearCookie('refresh_token', clearOpts);
    res.clearCookie('XSRF-TOKEN', clearOpts);
    return { message: 'Logged out' };
  }
}
