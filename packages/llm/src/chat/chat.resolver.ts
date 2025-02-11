import {
  Args,
  Int,
  Mutation,
  Query,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import { PubSub } from 'graphql-subscriptions';
import type { PubSubEngine } from 'graphql-subscriptions';
import { ChatService } from './chat.service.js';
import {
  Chat,
  Message,
  ContentItem,
  ContentItemInput,
} from './dto/chat.types.js';
import { ClaudeChain } from '../llm/llms/providers/claude.agent.js';
import { getTools, initializeMCPClient } from '../llm/mcp/client.js';
import { CustomLogger } from '../logger/logger.service.js';
import { timestamp } from 'rxjs';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../identity/guards/auth.guard.js';
import { User } from '../identity/dto/user.types.js';
import { CurrentUser } from '../identity/decorators/current-user.decorator.js';

const pubSub: PubSubEngine = new PubSub();
const agents = new Map<number, ClaudeChain>();

@Resolver(() => Chat)
export class ChatResolver {
  constructor(
    private chatService: ChatService,
    private readonly logger: CustomLogger,
  ) {
    this.logger.setContext('ChatResolver');
  }

  @Query(() => [Chat])
  @UseGuards(AuthGuard)
  async chats(@CurrentUser() user: User) {
    this.logger.log({ message: 'Fetching all chats' });
    return this.chatService.findAll(user.id);
  }

  @Query(() => Chat)
  @UseGuards(AuthGuard)
  async chat(
    @Args('id', { type: () => Int }) id: number,
    @CurrentUser() user: User,
  ) {
    this.logger.log({ message: 'Fetching single chat', id });
    return this.chatService.findOne(id, user.id);
  }

  @Query(() => String)
  @UseGuards(AuthGuard)
  async availableAgents() {}

  @Mutation(() => Chat)
  @UseGuards(AuthGuard)
  async createChat(
    @Args('title') title: string,
    @Args('type') type: string,
    @CurrentUser() user: User,
  ) {
    this.logger.log({ message: 'Creating new chat', title, type });
    const chat = await this.chatService.create({ 
      title,
      type,
      userId: user.id,
    });

    this.logger.log({
      message: 'Publishing chatCreated event',
      chatId: chat.id,
    });
    pubSub.publish('chatCreated', { chatCreated: chat });
    return chat;
  }

  @Mutation(() => Boolean)
  @UseGuards(AuthGuard)
  async sendMessage(
    @Args('chatId', { type: () => Int }) chatId: number,
    @Args('content', { type: () => ContentItemInput })
    content: ContentItemInput,
    @Args('role') role: string,
    @CurrentUser() user: User,
  ) {
    this.logger.log({ message: 'Sending message', chatId, role });

    const userMessage = await this.chatService.addMessage(chatId, {
      content: [content],
      role,
    });
    const chat = await this.chatService.findOne(chatId, user.id);
    this.logger.log({
      message: 'User message saved',
      messageId: userMessage.id,
    });
    pubSub.publish('messageCreated', { messageCreated: userMessage });
    //await this.agentService.sendPrompt(chatId.toString(), content.text);

    return true;
  }

  @Subscription(() => Chat)
  @UseGuards(AuthGuard)
  chatCreated() {
    this.logger.log({ message: 'Chat subscription initiated' });
    return pubSub.asyncIterableIterator('chatCreated');
  }

  @Subscription(() => Message, {
    filter: (payload, variables, context) => {
      return payload.messageCreated.chatId === variables.chatId;
    },
    resolve: (payload): Message | undefined => {
      if (payload && 'messageCreated' in payload) {
        return payload.messageCreated;
      }
    },
  })
  @UseGuards(AuthGuard)
  async messageCreated(
    @Args('chatId', { type: () => Int }) chatId: number,
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
    @CurrentUser() user: User,
  ) {
    this.logger.log({
      message: 'Message subscription initiated',
      chatId,
    });

    const iterator = pubSub.asyncIterableIterator('messageCreated');

    setTimeout(async () => {
      const chat = await this.chatService.findOne(chatId, user.id, {
        take: limit,
      });
      for (const msg of chat.messages) {
        await pubSub.publish('messageCreated', { messageCreated: msg });
      }
    }, 0);

    return iterator;
  }

  @Mutation(() => Boolean)
  @UseGuards(AuthGuard)
  async removeChat(@Args('id', { type: () => Int }) id: number) {
    this.logger.log({ message: 'Removing chat', id });
    return this.chatService.removeChat(id);
  }

  @Mutation(() => [String])
  @UseGuards(AuthGuard)
  async getModels() {
    return this.chatService.getAvailableModels();
  }
}
