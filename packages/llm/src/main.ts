import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { HOST, PORT, CORS_ORIGIN } from './config/app.config.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: CORS_ORIGIN,
    credentials: true,
  });
  await app.listen(PORT, HOST);
}
bootstrap();
