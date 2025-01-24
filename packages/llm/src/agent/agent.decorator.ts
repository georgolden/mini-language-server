import { AgentRegistry } from './agent-registry.js';

export function Agent(metadata: {
  type: string;
  description?: string;
}) {
  return (target: any) => {
    AgentRegistry.getInstance().register(target, metadata);
  };
}
