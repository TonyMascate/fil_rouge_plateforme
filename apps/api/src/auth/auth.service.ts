import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { RefreshToken } from './entities/refresh-token.entity';
import { UserLoginDto } from '@repo/shared/user';
import * as argon2 from 'argon2';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(dto: UserLoginDto): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
      select: ['id', 'email', 'password', 'role'],
    });
    if (user && (await argon2.verify(user.password, dto.password))) {
      const { password, ...result } = user;
      return result as User;
    }
    return null;
  }

  private async generateTokens(userId: string, role: string, email: string) {
    const tokenId = uuidv4();

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: userId,
          role,
          email,
        },
        {
          secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
          expiresIn: this.configService.getOrThrow('JWT_ACCESS_EXPIRES_IN') || '15m',
        },
      ),
      this.jwtService.signAsync(
        {
          id: userId,
          tokenId,
        },
        {
          secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
          expiresIn: this.configService.getOrThrow('JWT_REFRESH_EXPIRES_IN') || '7d',
        },
      ),
    ]);

    return { tokenId, accessToken, refreshToken };
  }

  async login(user: User) {
    const tokens = await this.generateTokens(user.id, user.role, user.email);

    const refreshTokenEntity = this.refreshTokenRepository.create({
      id: tokens.tokenId,
      user: user,
      tokenHash: await argon2.hash(tokens.refreshToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    await this.refreshTokenRepository.save(refreshTokenEntity);

    return tokens;
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
      const tokenId = payload.tokenId;
      const storedToken = await this.refreshTokenRepository.findOne({
        where: { id: tokenId },
        relations: ['user'],
      });
      if (!storedToken || storedToken.isRevoked || new Date() > storedToken.expiresAt) {
        throw new UnauthorizedException('Token invalide ou expiré');
      }

      const isValid = await argon2.verify(storedToken.tokenHash, refreshToken);

      if (!isValid) throw new UnauthorizedException('Token invalide');

      // Suppresion de l'ancien refresh token et création du nouveau
      await this.refreshTokenRepository.delete(storedToken.id);
      const tokens = await this.generateTokens(storedToken.user.id, storedToken.user.role, storedToken.user.email);
      await this.refreshTokenRepository.save({
        id: tokens.tokenId,
        user: storedToken.user,
        tokenHash: await argon2.hash(tokens.refreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Impossible de refresh le token jwt');
    }
  }
}
