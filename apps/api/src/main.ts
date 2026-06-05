import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ZodValidationPipe, cleanupOpenApiDoc } from 'nestjs-zod';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { Logger } from 'nestjs-pino';
import { readSecret } from './config/secret';

// Secrets Docker à injecter dans process.env avant l'init de NestJS.
// En dev, readSecret retombe sur process.env (pas de _FILE défini).
// En prod, lit /run/secrets/<name> (tmpfs RAM) pour que ConfigService le trouve.
const SECRET_NAMES = [
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'CLOUDFRONT_KEY_PAIR_ID',
  'CLOUDFRONT_PRIVATE_KEY_BASE64',
];

function loadSecrets() {
  for (const name of SECRET_NAMES) {
    const value = readSecret(name);
    if (value !== undefined) {
      process.env[name] = value;
    }
  }
}

loadSecrets();

const allowedOrigins = (process.env.FRONTEND_URL ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.use(cookieParser());
  app.useLogger(app.get(Logger));

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    allowedHeaders: ['Content-Type', 'X-XSRF-TOKEN'],
  });

  app.useGlobalPipes(new ZodValidationPipe());

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Fil Rouge API')
      .setVersion('1.0')
      .setDescription('API de la plateforme Fil Rouge — auth par cookies HttpOnly + CSRF (X-XSRF-TOKEN)')
      .addCookieAuth('access_token')
      .build();
    const document = cleanupOpenApiDoc(SwaggerModule.createDocument(app, config));
    SwaggerModule.setup('docs', app, document);
  }

  await app.listen(process.env.PORT ?? 3001);

  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
