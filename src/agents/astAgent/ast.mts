import { claudeClient, ClaudeEnhancedAgent } from '../llms/claude.mjs';
import { getTools } from '../../mcp/clients/ast.mjs';

const createASTAgent = async () => {
  const tools = await getTools();

  const agent = new ClaudeEnhancedAgent(
    [
      'You are assistant focused on the tool usage',
      'If you dont have enough information to call the tool',
      'ask a follow up questions to get it',
      'Dont make assumptions if you dont have enough information',
    ].join('\n'),
    claudeClient,
    tools,
  );

  return {
    sendMessage: agent.sendMessage.bind(agent),
  };
};

async function chat() {
  const { sendMessage } = await createASTAgent();

  const response = await sendMessage('List files from my project');
  console.log(response);
  const response2 = await sendMessage('Fine my project is located at folder ./src/agents/');
  console.log(response2);
}

chat();
