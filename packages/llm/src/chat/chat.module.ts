import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ChatResolver } from './chat.resolver.js';
import { ChatService } from './chat.service.js';
import { LoggerModule } from '../logger/logger.module.js';

@Module({
  imports: [PrismaModule, LoggerModule],
  providers: [ChatService, ChatResolver],
})
export class ChatModule {}
