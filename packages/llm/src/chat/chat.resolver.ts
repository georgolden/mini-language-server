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
import { ClaudeEnhancedAgent } from '../llm/llms/claude.agent.js';
import { createASTAgent } from '../llm/ast/ast.agent.js';
import { getTools, initializeMCPClient } from '../llm/mcp/client.js';
import { CustomLogger } from '../logger/logger.service.js';
import { AgentService } from '../agent/agent.service.js';

const pubSub: PubSubEngine = new PubSub();
const agents = new Map<number, ClaudeEnhancedAgent>();

@Resolver(() => Chat)
export class ChatResolver {
  constructor(
    private chatService: ChatService,
    private agentService: AgentService,
    private readonly logger: CustomLogger,
  ) {
    this.logger.setContext('ChatResolver');
  }

  @Query(() => [Chat])
  async chats() {
    this.logger.log({ message: 'Fetching all chats' });
    return this.chatService.findAll();
  }

  @Query(() => Chat)
  async chat(@Args('id', { type: () => Int }) id: number) {
    this.logger.log({ message: 'Fetching single chat', id });
    return this.chatService.findOne(id);
  }

  @Query(() => String)
  async availableAgents() {
    return this.agentService.getAvailableAgentTypes();
  }

  @Mutation(() => Chat)
  async createChat(@Args('title') title: string, @Args('type') type: string) {
    this.logger.log({ message: 'Creating new chat', title, type });
    const chat = await this.chatService.create({ title, type });

    this.logger.log({
      message: 'Publishing chatCreated event',
      chatId: chat.id,
    });
    pubSub.publish('chatCreated', { chatCreated: chat });
    return chat;
  }

  @Mutation(() => Boolean)
  async sendMessage(
    @Args('chatId', { type: () => Int }) chatId: number,
    @Args('content', { type: () => ContentItemInput })
    content: ContentItemInput,
    @Args('role') role: string,
  ) {
    this.logger.log({ message: 'Sending message', chatId, role });

    const userMessage = await this.chatService.addMessage(chatId, {
      content: [content],
      role,
    });
    const chat = await this.chatService.findOne(chatId);
    this.logger.log({
      message: 'User message saved',
      messageId: userMessage.id,
    });
    pubSub.publish('messageCreated', { messageCreated: userMessage });
    await this.agentService.sendPrompt(chatId.toString(), content.text);

    return true;
  }

  @Subscription(() => Chat)
  chatCreated() {
    this.logger.log({ message: 'Chat subscription initiated' });
    return pubSub.asyncIterableIterator('chatCreated');
  }

  @Subscription(() => Message, {
    filter(
      this: ChatResolver,
      payload: { messageCreated: Message },
      variables: { chatId: number },
    ) {
      this.logger.log({
        message: 'Filtering message subscription',
        messageId: payload.messageCreated.id,
        targetChatId: variables.chatId,
        actualChatId: payload.messageCreated.chatId,
      });
      return payload.messageCreated.chatId === variables.chatId;
    },
    resolve: (payload): Message | undefined => {
      if (payload && 'messageCreated' in payload) {
        return payload.messageCreated;
      }
    },
  })
  messageCreated(@Args('chatId', { type: () => Int }) chatId: number) {
    this.logger.log({
      message: 'Message subscription initiated',
      chatId,
    });
    return pubSub.asyncIterableIterator('messageCreated');
  }
}
