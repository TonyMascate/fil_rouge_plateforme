import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ZodValidationPipe } from 'nestjs-zod';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    allowedHeaders: ['Content-Type', 'X-XSRF-TOKEN'],
  });

  app.useGlobalPipes(new ZodValidationPipe());

  await app.listen(process.env.PORT ?? 3001);

  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
