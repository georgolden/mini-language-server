import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import cookieParser from 'cookie-parser';
import { IdentityModule } from './identity/identity.module';
import { AuthMiddleware } from './identity/middleware/auth.middleware';
import { ChatModule } from './chat/chat.module';
import { PrismaModule } from './prisma/prisma.module';
import { AppController } from './app.controller';

@Module({
  imports: [
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
    consumer.apply(cookieParser(), AuthMiddleware).forRoutes('*');
  }
}
