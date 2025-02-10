import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ChatResolver } from './chat.resolver.js';
import { ChatService } from './chat.service.js';
import { LoggerModule } from '../logger/logger.module.js';
import { AuthGuard } from '../identity/guards/auth.guard.js';
import { IdentityModule } from '../identity/identity.module.js';

@Module({
  imports: [PrismaModule, LoggerModule, IdentityModule],
  providers: [ChatService, ChatResolver, AuthGuard],
})
export class ChatModule {}
