import { claudeClient, ClaudeEnhancedAgent } from '../llms/claude.mjs';
import { getTools } from '../../mcp/clients/ast.mjs';

const createASTAgent = async () => {
  const tools = await getTools();

  const agent = new ClaudeEnhancedAgent(
    ['You are a helpful assistant'].join('\n'),
    claudeClient,
    tools,
  );

  return {
    sendMessage: agent.sendMessage.bind(agent),
  };
};

async function chat() {
  const { sendMessage } = await createASTAgent();

  const response = await sendMessage('List project directory');
  console.log(response);
}

chat();
