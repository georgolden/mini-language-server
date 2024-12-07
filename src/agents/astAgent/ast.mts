import { claudeClient, ClaudeEnhancedAgent } from '../llms/claude.mjs';

const agent = new ClaudeEnhancedAgent(
  ['Parse AST shit for me UWU', '123', '123'].join('\n'),
  claudeClient,
);

async function chat() {
  const response = await agent.sendMessage('Tell me about cats!');
  console.log(response);

  const response2 = await agent.sendMessage('Do cats rly sleep for 12-16 hours??');
  console.log(response2);

  const response3 = await agent.sendMessage('Am i a cat, lol?? i think i have the same needs :(');
  console.log(response3);
}

chat();
