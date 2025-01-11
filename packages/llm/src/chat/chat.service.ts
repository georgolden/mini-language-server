import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ClaudeEnhancedAgent } from '../llm/llms/claude.agent.js';

@Injectable()
export class ChatService {
  private agents = new Map<number, ClaudeEnhancedAgent>();

  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.chat.findMany({
      include: { messages: true },
    });
  }

  async findOne(id: number) {
    return this.prisma.chat.findUnique({
      where: { id },
      include: { messages: true },
    });
  }

  async create(data: { title: string; type: string; metadata: string }) {
    return this.prisma.chat.create({
      data: { title: data.title, metadata: data.metadata, type: data.type },
      include: { messages: true },
    });
  }

  async addMessage(chatId: number, data: { content: string; role: string }) {
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
