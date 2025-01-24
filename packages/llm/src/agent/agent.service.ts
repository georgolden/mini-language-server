import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { CustomLogger } from '../logger/logger.service.js';
import { AgentConfig } from './types.js';
import type { PubSubEngine } from 'graphql-subscriptions';
import { Agent } from 'src/llm/llms/base.agent.js';
import { AgentRegistry } from './agent-registry.js';

@Injectable()
export class AgentService implements OnModuleDestroy {
  private readonly sessions = new Map<string, Agent>();
  private cleanupInterval: NodeJS.Timeout;
  private readonly INACTIVITY_THRESHOLD = 30 * 60 * 1000;

  constructor(
    private readonly logger: CustomLogger,
    private readonly pubSub: PubSubEngine,
  ) {
    this.logger.setContext('AgentService');
    //this.cleanupInterval = setInterval(
    //  () => this.cleanupInactiveSessions(),
    //  5 * 60 * 1000,
    //);
  }

  //private cleanupInactiveSessions() {
  //  const now = Date.now();
  //  for (const [sessionId, session] of this.sessions.entries()) {
  //    if (now - session.lastActive > this.INACTIVITY_THRESHOLD) {
  //      this.sessions.delete(sessionId);
  //      this.logger.log({
  //        message: 'Cleaned up inactive session',
  //        sessionId,
  //        type: session.type,
  //      });
  //    }
  //  }
  //}
  //
  getAvailableAgentTypes() {
    return AgentRegistry.getInstance().getAgentTypes();
  }

  async getOrCreateAgent(sessionId: string, type: string): Promise<Agent> {
    const existingAgent = this.sessions.get(sessionId);
    if (existingAgent) return existingAgent;

    const AgentClass = AgentRegistry.getInstance().getAgentClass(type);
    const agent = new AgentClass();
    await agent.initialize();

    this.sessions.set(sessionId, agent);
    return agent;
  }

  async sendPrompt(
    sessionId: string,
    chatId: string,
    prompt: unknown,
    type: string,
  ): Promise<void> {
    const agent = await this.getOrCreateAgent(sessionId, type);

    agent.subscribe(() => {
      this.pubSub.publish('messageCreated', {
        chatId,
        content: prompt,
        role: 'user',
      });
    });

    agent.sendMessage(prompt);
  }

  onModuleDestroy() {
    clearInterval(this.cleanupInterval);
    this.sessions.clear();
  }
}
