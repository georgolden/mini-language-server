import { Module } from '@nestjs/common';
import { AuthService } from './services/auth.service.js';
import { UserService } from './services/user.service.js';
import { OAuthService } from './services/oauth.service.js';
import { SessionService } from './services/session.service.js';
import { AuthResolver } from './resolvers/auth.resolver.js';
import { UserResolver } from './resolvers/user.resolver.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  providers: [
    AuthService,
    UserService,
    OAuthService,
    SessionService,
    AuthResolver,
    UserResolver,
  ],
  exports: [AuthService, UserService, SessionService],
})
export class IdentityModule {}
