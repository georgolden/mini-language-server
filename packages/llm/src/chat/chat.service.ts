import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ClaudeEnhancedAgent } from '../llm/llms/claude.agent.js';
import { CustomLogger } from '../logger/logger.service.js';

@Injectable()
export class ChatService {
  private agents = new Map<number, ClaudeEnhancedAgent>();

  constructor(
    private prisma: PrismaService,
    private readonly logger: CustomLogger
  ) {
    this.logger.setContext('ChatService');
  }

  async findAll() {
    this.logger.log({ message: 'Finding all chats' });
    return this.prisma.chat.findMany({
      include: { messages: true },
    });
  }

  async findOne(id: number) {
    this.logger.log({ message: 'Finding chat by id', id });
    return this.prisma.chat.findUnique({
      where: { id },
      include: { messages: true },
    });
  }

  async create(data: { title: string; type: string }) {
    this.logger.log({ message: 'Creating new chat', data });
    return this.prisma.chat.create({
      data: { title: data.title, metadata: data.metadata, type: data.type },
      include: { messages: true },
    });
  }

  async addMessage(chatId: number, data: { content: string; role: string }) {
    this.logger.log({ message: 'Adding message to chat', chatId, data });
    return this.prisma.message.create({
      data: {
        ...data,
        chatId,
      },
    });
  }

  setAgent(chatId: number, agent: ClaudeEnhancedAgent) {
    this.agents.set(chatId, agent);
  }

  getAgent(chatId: number) {
    return this.agents.get(chatId);
  }
}
