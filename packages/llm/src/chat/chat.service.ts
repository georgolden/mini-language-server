import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ClaudeChain } from '../llm/llms/providers/claude.agent.js';
import { CustomLogger } from '../logger/logger.service.js';
import type { ContentItem } from 'src/llm/llms/types.js';

@Injectable()
export class ChatService {
  private agents = new Map<number, ClaudeChain>();

  constructor(
    private prisma: PrismaService,
    private readonly logger: CustomLogger,
  ) {
    this.logger.setContext('ChatService');
  }

  async findAll(userId: number) {
    this.logger.log({ message: `Finding all chats`, userId });
    return this.prisma.chat.findMany({
      where: {
        userId,
      },
      include: {
        messages: {
          include: {
            content: true,
          },
        },
      },
    });
  }

  async findOne(id: number, userId: number, options?: { take?: number }) {
    this.logger.log({ message: 'Finding chat by id', id, userId });
    return this.prisma.chat.findUnique({
      where: { id, userId },
      include: {
        messages: {
          take: options?.take || undefined,
          orderBy: {
            timestamp: 'desc',
          },
          include: {
            content: true,
          },
        },
      },
    });
  }

  async create(data: { title: string; type: string, userId: number }) {
    this.logger.log({ message: 'Creating new chat', data });
    return this.prisma.chat.create({
      data: { userId: data.userId, title: data.title, type: data.type },
      include: { messages: true },
    });
  }

  async removeChat(id: number) {
    this.logger.log({ message: 'Removing chat', id });

    await this.prisma.contentItem.deleteMany({
      where: {
        message: {
          chatId: id,
        },
      },
    });

    await this.prisma.message.deleteMany({
      where: {
        chatId: id,
      },
    });

    await this.prisma.chat.delete({
      where: { id },
    });

    // Clean up any associated agent
    this.agents.delete(id);

    return true;
  }

  async getAvailableModels() {
    return ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest'];
  }

  async addMessage(
    chatId: number,
    data: { content: ContentItem[]; role: string },
  ) {
    this.logger.log({ message: 'Adding message to chat', chatId, data });
    return this.prisma.message.create({
      data: {
        chatId,
        role: data.role,
        content: {
          create: data.content.map((item) => ({
            type: item.type,
            text: item.text,
            name: item.name,
            input: item.input,
            content: item.content,
          })),
        },
      },
    });
  }

  setAgent(chatId: number, agent: ClaudeChain) {
    this.agents.set(chatId, agent);
  }

  getAgent(chatId: number) {
    return this.agents.get(chatId);
  }
}
