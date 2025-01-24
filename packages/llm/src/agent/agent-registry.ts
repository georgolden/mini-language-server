export class AgentRegistry {
  private static instance: AgentRegistry;
  private readonly registry = new Map<
    any,
    { type: string; description?: string }
  >();

  static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  register(agentClass: any, metadata: { type: string; description?: string }) {
    this.registry.set(agentClass, metadata);
  }

  getAgentTypes(): Array<{ type: string; description?: string }> {
    return Array.from(this.registry.values());
  }

  getAgentClass(type: string): any {
    for (const [agentClass, metadata] of this.registry.entries()) {
      if (metadata.type === type) return agentClass;
    }
    throw new Error(`Unknown agent type: ${type}`);
  }
}
