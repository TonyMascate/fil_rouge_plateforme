import { Body, Controller, HttpStatus, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
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

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private usersService: UsersService,
    private configService: ConfigService,
  ) {}

  private setCookies(res: Response, accesToken: string, refreshToken: string) {
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

    res.cookie('XSRF-TOKEN', uuidv4(), {
      ...opts,
      httpOnly: false,
    });
  }

  @Post('register')
  @SkipCsrf()
  async register(@Body() createUserDto: CreateUserDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.usersService.create(createUserDto);
    const { accessToken, refreshToken } = await this.authService.login(user);
    this.setCookies(res, accessToken, refreshToken);
    return { user };
  }

  @Post('login')
  @SkipCsrf()
  @Throttle({ short: { ttl: 60000, limit: 5 } })
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
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies['refresh_token'];
    if (!refreshToken) {
      throw new UnauthorizedException();
    }
    const { accessToken, refreshToken: newRefreshToken } = await this.authService.refreshTokens(refreshToken);
    this.setCookies(res, accessToken, newRefreshToken);
    return { message: 'Refreshed' };
  }

  @Post('logout')
  @SkipCsrf()
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
