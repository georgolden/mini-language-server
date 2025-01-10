import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ChatResolver } from './chat.resolver.js';
import { ChatService } from './chat.service.js';

@Module({
  imports: [PrismaModule],
  providers: [ChatService, ChatResolver],
})
export class ChatModule {}
