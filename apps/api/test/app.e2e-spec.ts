/**
 * Tests E2E — couche HTTP (Supertest)
 *
 * Vérifie le routage, la validation des DTOs (ZodValidationPipe) et les
 * cookies posés par les réponses. Les services métier sont tous mockés ;
 * aucune BDD, aucun Redis, aucun conteneur requis.
 *
 * CsrfGuard n'est pas enregistré ici : ce n'est pas un APP_GUARD dans le
 * module de test (le token APP_GUARD + useValue provoque une erreur de
 * metatype dans NestJS v11). Le comportement CSRF est couvert par
 * csrf.guard.spec.ts (tests unitaires).
 *
 * JwtAuthGuard et RolesGuard sont remplacés par des valeurs simples via
 * overrideGuard().useValue() — les vraies logiques sont testées dans leurs
 * spec unitaires respectives.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import cookieParser from 'cookie-parser';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ZodValidationPipe } from 'nestjs-zod';

import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { UsersController } from '../src/users/users.controller';
import { UsersService } from '../src/users/users.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';

const JWT_SECRET = 'e2e-test-jwt-secret';

// ─── Gardes E2E (simples objets, pas de classes @Injectable) ─────────────────

let jwtService: JwtService;

// Reproduit JwtAuthGuard : vérifie le cookie access_token avec le vrai JwtService
const e2eJwtGuard = {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<any>();
    const token: string | undefined = req.cookies?.['access_token'];
    if (!token) throw new UnauthorizedException();
    try {
      const payload = jwtService.verify<any>(token);
      req.user = { userId: payload.sub, role: payload.role, email: payload.email };
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  },
};

// Reproduit RolesGuard : lit le metadata @Roles() directement via Reflect
const e2eRolesGuard = {
  canActivate(context: ExecutionContext): boolean {
    const required: string[] | undefined = Reflect.getMetadata('roles', context.getHandler());
    if (!required) return true;
    const req = context.switchToHttp().getRequest<any>();
    if (!req.user || !required.includes(req.user.role)) throw new UnauthorizedException();
    return true;
  },
};

// ─── Mocks des services métier ────────────────────────────────────────────────

const mockUser = {
  id: 'user-uuid',
  email: 'test@example.com',
  firstName: 'Jean',
  lastName: 'Dupont',
  role: 'user',
};

const mockAuthService = {
  validateUser: jest.fn(),
  login: jest.fn().mockResolvedValue({ accessToken: 'at', refreshToken: 'rt' }),
  refreshTokens: jest.fn(),
};

const mockUsersService = {
  create: jest.fn().mockResolvedValue(mockUser),
  getProfile: jest.fn().mockResolvedValue(mockUser),
  findAll: jest.fn().mockResolvedValue([mockUser]),
};

// ─── Suite principale ─────────────────────────────────────────────────────────

describe('API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = JWT_SECRET;
    process.env.JWT_REFRESH_SECRET = 'e2e-refresh-secret';
    process.env.JWT_ACCESS_EXPIRES_IN = '15m';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';
    process.env.NODE_ENV = 'test';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        JwtModule.register({ secret: JWT_SECRET, signOptions: { expiresIn: '15m' } }),
      ],
      controllers: [AppController, AuthController, UsersController],
      providers: [
        AppService,
        { provide: AuthService, useValue: mockAuthService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(e2eJwtGuard)
      .overrideGuard(RolesGuard)
      .useValue(e2eRolesGuard)
      .compile();

    jwtService = moduleFixture.get<JwtService>(JwtService);

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthService.login.mockResolvedValue({ accessToken: 'at', refreshToken: 'rt' });
    mockUsersService.create.mockResolvedValue(mockUser);
    mockUsersService.getProfile.mockResolvedValue(mockUser);
  });

  // ─── AppController ──────────────────────────────────────────────────────────

  describe('GET /', () => {
    it('200 — retourne le message de bienvenue', async () => {
      const res = await request(app.getHttpServer()).get('/');
      expect(res.status).toBe(200);
      expect(res.text).toBe('Hellooo World!');
    });
  });

  // ─── AuthController ─────────────────────────────────────────────────────────

  describe('POST /auth/register', () => {
    it("201 — crée l'utilisateur et pose les cookies d'auth", async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'new@example.com', password: 'Password123!', firstName: 'Alice', lastName: 'Martin' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe('test@example.com');

      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies.some((cookie) => cookie.startsWith('access_token='))).toBe(true);
      expect(cookies.some((cookie) => cookie.startsWith('refresh_token='))).toBe(true);
    });

    it('400 — rejette un body sans email', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ password: 'Password123!', firstName: 'Alice', lastName: 'Martin' });
      expect(res.status).toBe(400);
    });

    it('400 — rejette un mot de passe trop court', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'new@example.com', password: '123', firstName: 'Alice', lastName: 'Martin' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    it('201 — retourne le user et pose les cookies si credentials valides', async () => {
      mockAuthService.validateUser.mockResolvedValue(mockUser);

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'Password123!' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('user');

      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies.some((cookie) => cookie.startsWith('access_token='))).toBe(true);
    });

    it('401 — credentials invalides (validateUser retourne null)', async () => {
      mockAuthService.validateUser.mockResolvedValue(null);

      // Password valide (passe la validation Zod) mais mock renvoie null → 401
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'Password123!' });

      expect(res.status).toBe(401);
    });

    it('400 — email malformé', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'pas-un-email', password: 'Password123!' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /auth/logout', () => {
    it('201 — retourne { message: "Logged out" } et efface les cookies', async () => {
      const res = await request(app.getHttpServer()).post('/auth/logout');

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ message: 'Logged out' });

      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies.some((cookie) => cookie.includes('access_token=;'))).toBe(true);
    });
  });

  describe('POST /auth/refresh', () => {
    it('401 — sans cookie refresh_token', async () => {
      const res = await request(app.getHttpServer()).post('/auth/refresh');
      expect(res.status).toBe(401);
    });

    it('201 — renouvelle les tokens si refresh_token présent', async () => {
      mockAuthService.refreshTokens.mockResolvedValue({ accessToken: 'new-at', refreshToken: 'new-rt' });

      const res = await request(app.getHttpServer()).post('/auth/refresh').set('Cookie', 'refresh_token=valid-token');

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ message: 'Refreshed' });
    });
  });

  // ─── UsersController ─────────────────────────────────────────────────────────

  describe('GET /users/profile', () => {
    it('401 — sans access_token (JwtAuthGuard actif)', async () => {
      const res = await request(app.getHttpServer()).get('/users/profile');
      expect(res.status).toBe(401);
    });

    it('200 — retourne le profil avec un access_token valide', async () => {
      const token = await jwtService.signAsync({ sub: 'user-uuid', role: 'user', email: 'test@example.com' });

      const res = await request(app.getHttpServer()).get('/users/profile').set('Cookie', `access_token=${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('email', 'test@example.com');
    });
  });

  describe('GET /users/admin-only', () => {
    it('401 — sans JWT', async () => {
      const res = await request(app.getHttpServer()).get('/users/admin-only');
      expect(res.status).toBe(401);
    });

    it('401 — JWT valide mais rôle "user" insuffisant (RolesGuard)', async () => {
      const token = await jwtService.signAsync({ sub: 'user-uuid', role: 'user', email: 'test@example.com' });

      const res = await request(app.getHttpServer()).get('/users/admin-only').set('Cookie', `access_token=${token}`);

      expect(res.status).toBe(401);
    });
  });
});
