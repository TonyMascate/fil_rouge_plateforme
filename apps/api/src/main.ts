import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ZodValidationPipe } from 'nestjs-zod';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3001);
  app.useGlobalPipes(new ZodValidationPipe());
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
