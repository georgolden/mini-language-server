import { Module } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { UserService } from './services/user.service';
import { OAuthService } from './services/oauth.service';
import { SessionService } from './services/session.service';
import { AuthResolver } from './resolvers/auth.resolver';
import { UserResolver } from './resolvers/user.resolver';
import { PrismaModule } from '../prisma/prisma.module';

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
