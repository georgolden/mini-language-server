import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  AnthropicClient,
  ClaudeChain,
} from '../llm/llms/providers/claude.agent.js';
import { CustomLogger } from '../logger/logger.service.js';
import type { ContentItem } from '../llm/llms/types.js';
import { GroqClient } from '../llm/llms/providers/groq.agent.js';
import { OpenAIClient } from '../llm/llms/providers/openai.agent.js';
import { MistralAIClient } from '../llm/llms/providers/mistral.agent.js';
import { DeepseekClient } from '../llm/llms/providers/deepseek.agent.js';
import { Model } from './dto/chat.types.js';

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
    this.logger.log({ message: 'Finding all chats', userId });
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

  async create(data: { userId: number; prompt: string }) {
    this.logger.log({ message: 'Creating new chat', data });

    console.log('Initial prompt', data.prompt);

    return this.prisma.chat.create({
      data: { userId: data.userId },
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
  async getAvailableModels(): Promise<Model[]> {
    const models: Model[] = (
      await Promise.all(
        Object.entries({
          anthropic: AnthropicClient.getModels(),
          groq: GroqClient.getModels(),
          openai: OpenAIClient.getModels(),
          mistral: MistralAIClient.getModels(),
          deepseek: DeepseekClient.getModels(),
        }).flatMap(async ([provider, valPromise]) =>
          (
            await valPromise
          ).map(({ name, id }) => ({
            provider,
            modelName: name,
            modelId: id,
          })),
        ),
      )
    ).flat();
    return models;
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
