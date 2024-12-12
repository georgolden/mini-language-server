import { claudeClient, ClaudeEnhancedAgent } from '../llms/claude.js';
import { getTools, registerSamplings } from '../../mcp/clients/ast.js';

const createASTAgent = async () => {
  const tools = await getTools();

  const agent = new ClaudeEnhancedAgent({
    systemPrompt:
      'You are assistant focused on the tool usage. ' +
      'If you dont have enough information to call the tool ' +
      'ask a follow up questions to get it. ' +
      'Dont make assumptions if you dont have enough information.',
    client: claudeClient,
    tools,
  });

  registerSamplings(
    new ClaudeEnhancedAgent({
      systemPrompt: 'You are assistant that helps summarize code snippets ant other file content',
      client: claudeClient,
      simpleModel: true,
    }),
  );

  return {
    sendMessage: agent.sendMessage.bind(agent),
  };
};

async function chat() {
  const { sendMessage } = await createASTAgent();

  const response = await sendMessage(
    'Summarize files from my project ./src/agents/ and print the entire project summary',
  );
  console.log(response);
}

chat();
