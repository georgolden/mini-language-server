import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { HOST, PORT, CORS_ORIGIN } from './config/app.config.js';
import { AllExceptionsFilter } from './logger/all-exceptions.filter.js';
import { CustomLogger } from './logger/logger.service.js';
import { HttpAdapterHost } from '@nestjs/core';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: CORS_ORIGIN,
    credentials: true,
  });

  const logger = await app.resolve(CustomLogger);
  const httpAdapter = app.get(HttpAdapterHost);

  app.useGlobalFilters(new AllExceptionsFilter(logger, httpAdapter));
  await app.listen(PORT, HOST);

  logger.log(`Server is running on http://${HOST}:${PORT}`);
}

bootstrap();
