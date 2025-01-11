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
import { Chat, Message } from './dto/chat.types.js';
import { ClaudeEnhancedAgent } from '../llm/llms/claude.agent.js';
import { createASTAgent } from '../llm/ast/ast.agent.js';
import { getTools, initializeMCPClient } from '../llm/mcp/client.js';
import { createClaudeClient } from '../llm/llms/claude.agent.js';
import { CustomLogger } from '../logger/logger.service.js';
import { ANTHROPIC_API } from '../config/app.config.js';

const pubSub: PubSubEngine = new PubSub();
const agents = new Map<number, ClaudeEnhancedAgent>();

@Resolver(() => Chat)
export class ChatResolver {
  constructor(
    private chatService: ChatService,
    private readonly logger: CustomLogger
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

  @Mutation(() => Chat)
  async createChat(@Args('title') title: string, @Args('type') type: string) {
    this.logger.log({ message: 'Creating new chat', title, type });
    const chat = await this.chatService.create({ title, type });

    const claudeClient = createClaudeClient(ANTHROPIC_API);
    const mcpClient = await initializeMCPClient();
    const agent = await createASTAgent(claudeClient, await getTools(mcpClient), mcpClient);
    agents.set(chat.id, agent);

    this.logger.log({ message: 'Publishing chatCreated event', chatId: chat.id });
    pubSub.publish('chatCreated', { chatCreated: chat });
    return chat;
  }

  @Mutation(() => Message)
  async sendMessage(
    @Args('chatId', { type: () => Int }) chatId: number,
    @Args('content') content: string,
    @Args('role') role: string,
  ) {
    this.logger.log({ message: 'Sending message', chatId, role });
    const agent = agents.get(chatId);
    if (!agent) {
      this.logger.error({ message: 'No active agent found', chatId });
      throw new Error('No active agent');
    }

    const userMessage = await this.chatService.addMessage(chatId, { content, role });
    this.logger.log({ message: 'User message saved', messageId: userMessage.id });
    pubSub.publish('messageCreated', { messageCreated: userMessage, chatId });

    await agent.sendMessage(content);
    const agentMessages = agent.getMessages();
    const lastMessage = agentMessages[agentMessages.length - 1];

    if (lastMessage) {
      const assistantMessage = await this.chatService.addMessage(chatId, {
        content: lastMessage.content as string,
        role: 'assistant',
      });
      this.logger.log({ message: 'Assistant message saved', messageId: assistantMessage.id });
      pubSub.publish('messageCreated', { messageCreated: assistantMessage, chatId });
      return assistantMessage;
    }

    return userMessage;
  }

  @Subscription(() => Chat)
  chatCreated() {
    this.logger.log({ message: 'Chat subscription initiated' });
    return pubSub.asyncIterableIterator('chatCreated');
  }

  @Subscription(() => Message, {
    filter(this: ChatResolver, payload: { messageCreated: Message }, variables: { chatId: number }) {
      this.logger.log({
        message: 'Filtering message subscription',
        messageId: payload.messageCreated.id,
        targetChatId: variables.chatId,
        actualChatId: payload.messageCreated.chatId
      });
      return payload.messageCreated.chatId === variables.chatId;
    }
  })
  messageCreated(@Args('chatId', { type: () => Int }) chatId: number) {
    this.logger.log({ message: 'Message subscription initiated', chatId });
    return pubSub.asyncIterableIterator('messageCreated');
  }
}
