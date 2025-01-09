import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ChatResolver } from './chat.resolver';
import { ChatService } from './chat.service';

@Module({
  imports: [PrismaModule],
  providers: [ChatService, ChatResolver],
})
export class ChatModule {}
