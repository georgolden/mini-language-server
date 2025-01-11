import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import cookieParser from 'cookie-parser';
import { IdentityModule } from './identity/identity.module.js';
import { AuthMiddleware } from './identity/middleware/auth.middleware.js';
import { ChatModule } from './chat/chat.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AppController } from './app.controller.js';
import { LoggerModule } from './logger/logger.module.js';
import { LoggerMiddleware } from './logger/logger.middleware.js';

@Module({
  imports: [
    LoggerModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: 'graphql/schema.graphql',
      sortSchema: true,
      context: ({ req, res }) => ({ req, res }),
    }),
    PrismaModule,
    IdentityModule,
    ChatModule,
  ],
  controllers: [AppController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(cookieParser(), LoggerMiddleware, AuthMiddleware)
      .forRoutes('*');
  }
}
