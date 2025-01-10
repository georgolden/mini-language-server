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

const pubSub: PubSubEngine = new PubSub();
const agents = new Map<number, ClaudeEnhancedAgent>();

@Resolver(() => Chat)
export class ChatResolver {
  constructor(private chatService: ChatService) {}

  @Query(() => [Chat])
  async chats() {
    return this.chatService.findAll();
  }

  @Query(() => Chat)
  async chat(@Args('id', { type: () => Int }) id: number) {
    return this.chatService.findOne(id);
  }

  @Mutation(() => Chat)
  async createChat(@Args('title') title: string, @Args('type') type: string) {
    const chat = await this.chatService.create({ title, type });

    const claudeClient = createClaudeClient(process.env.ANTHROPIC_API);
    const mcpClient = await initializeMCPClient();
    const agent = await createASTAgent(
      claudeClient,
      await getTools(mcpClient),
      mcpClient,
    );
    agents.set(chat.id, agent);

    pubSub.publish('chatCreated', { chatCreated: chat });
    return chat;
  }

  @Mutation(() => Message)
  async sendMessage(
    @Args('chatId', { type: () => Int }) chatId: number,
    @Args('content') content: string,
    @Args('role') role: string,
  ) {
    const agent = agents.get(chatId);
    if (!agent) {
      throw new Error('No active agent');
    }

    // Save user message
    const userMessage = await this.chatService.addMessage(chatId, {
      content,
      role,
    });
    pubSub.publish('messageCreated', { messageCreated: userMessage, chatId });

    // Get agent response
    await agent.sendMessage(content);
    const agentMessages = agent.getMessages();
    const lastMessage = agentMessages[agentMessages.length - 1];

    if (lastMessage) {
      const assistantMessage = await this.chatService.addMessage(chatId, {
        content: lastMessage.content as string,
        role: 'assistant',
      });
      pubSub.publish('messageCreated', {
        messageCreated: assistantMessage,
        chatId,
      });
      return assistantMessage;
    }

    return userMessage;
  }

  @Subscription(() => Chat)
  chatCreated() {
    return pubSub.asyncIterableIterator('chatCreated');
  }

  @Subscription(() => Message, {
    filter: (payload, variables) =>
      payload.messageCreated.chatId === variables.chatId,
  })
  messageCreated(@Args('chatId', { type: () => Int }) chatId: number) {
    return pubSub.asyncIterableIterator('messageCreated');
  }
}
