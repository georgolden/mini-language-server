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
import { ImageModule } from './images/images.module.js';
import { MembersModule } from './members/members.module.js';

@Module({
  imports: [
    LoggerModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: 'graphql/schema.graphql',
      sortSchema: true,
      playground: true,
      subscriptions: {
        'graphql-ws': true,
      },
      context: ({ req, res, connection }) => ({ req, res, connection }),
    }),
    PrismaModule,
    IdentityModule,
    ChatModule,
    MembersModule,
    ImageModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(cookieParser(), LoggerMiddleware, AuthMiddleware)
      .forRoutes('*');
  }
}
