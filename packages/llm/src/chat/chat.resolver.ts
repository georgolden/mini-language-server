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

const pubSub: PubSubEngine = new PubSub();
const agents = new Map<number, ClaudeEnhancedAgent>();

@Resolver(() => Chat)
export class ChatResolver {
  constructor(
    private chatService: ChatService,
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

  @Mutation(() => Chat)
  async createChat(@Args('title') title: string, @Args('type') type: string) {
    this.logger.log({ message: 'Creating new chat', title, type });
    const chat = await this.chatService.create({ title, type });

    const mcpClient = await initializeMCPClient();
    const agent = await createASTAgent(await getTools(mcpClient), mcpClient);
    agents.set(chat.id, agent);

    this.logger.log({
      message: 'Publishing chatCreated event',
      chatId: chat.id,
    });
    pubSub.publish('chatCreated', { chatCreated: chat });
    return chat;
  }

  @Mutation(() => Message)
  async sendMessage(
    @Args('chatId', { type: () => Int }) chatId: number,
    @Args('content', { type: () => ContentItemInput })
    content: ContentItemInput,
    @Args('role') role: string,
  ) {
    this.logger.log({ message: 'Sending message', chatId, role });
    const agent = agents.get(chatId);
    if (!agent) {
      const mcpClient = await initializeMCPClient();
      const agent = await createASTAgent(await getTools(mcpClient), mcpClient);
      agents.set(chatId, agent);
    }

    const userMessage = await this.chatService.addMessage(chatId, {
      content: [content],
      role,
    });
    this.logger.log({
      message: 'User message saved',
      messageId: userMessage.id,
    });
    pubSub.publish('messageCreated', { messageCreated: userMessage });

    await agent.sendMessage(content);
    const agentMessages = agent.getMessages();
    const lastMessage = agentMessages[agentMessages.length - 1];

    if (lastMessage) {
      const assistantMessage = await this.chatService.addMessage(chatId, {
        content:
          typeof lastMessage.content === 'string'
            ? [{ type: 'text', text: lastMessage.content }]
            : lastMessage.content,
        role: 'assistant',
      });
      this.logger.log({
        message: 'Assistant message saved',
        messageId: assistantMessage.id,
      });
      pubSub.publish('messageCreated', {
        messageCreated: assistantMessage,
      });
      return assistantMessage;
    }

    return userMessage;
  }

  @Subscription(() => Chat)
  chatCreated() {
    this.logger.log({ message: 'Chat subscription initiated' });
    return pubSub.asyncIterableIterator('chatCreated');
  }

  //@Subscription(() => Message, {
  //  filter(this: ChatResolver, payload: { messageCreated: Message }, variables: { chatId: number }) {
  //    this.logger.log({
  //      message: 'Filtering message subscription',
  //      messageId: payload.messageCreated.id,
  //      targetChatId: variables.chatId,
  //      actualChatId: payload.messageCreated.chatId
  //    });
  //    return payload.messageCreated.chatId === variables.chatId;
  //  },
  //  resolve: (payload: { messageCreated: Message }) => payload.messageCreated,
  //})
  //messageCreated(@Args('chatId', { type: () => Int }) chatId: number) {
  //  this.logger.log({ message: 'Message subscription initiated', chatId });
  //  return pubSub.asyncIterableIterator('messageCreated');
  //}
  @Subscription(() => Message, {
    filter: (payload, variables) => {
      if (!payload?.messageCreated) return false;
      return payload.chatId === variables.chatId;
    },
    //resolve: (payload) => {
    //  console.log(payload);
    //
    //  return payload?.messageCreated;
    //
    //
    //},
    resolve: (payload) => {
      console.log('Payload type:', typeof payload);
      console.log('Full payload:', payload);

      // Only return if we have a real message
      if (payload && 'messageCreated' in payload) {
        return payload.messageCreated;
      }

      // Return a dummy message during initialization
      return {
        id: 0,
        chatId: 0,
        content: [],
        role: '',
        timestamp: new Date(),
      };
    },

    //resolve: (payload) => payload.messageCreated,
  })
  messageCreated(@Args('chatId', { type: () => Int }) chatId: number) {
    return pubSub.asyncIterableIterator('messageCreated');
  }
}
