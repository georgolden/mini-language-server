import { claudeClient, ClaudeEnhancedAgent } from '../llms/claude.mjs';


const agent = new ClaudeEnhancedAgent(
  ['Parse AST shit for me UWU', '123', '123'].join('\n'),
  claudeClient,
  [

  ]
);


export const sendMessage = agent.sendMessage

async function chat() {
  const response = await sendMessage('Tell me about cats!')
  console.log(response);

  const response2 = await sendMessage('Do cats rly sleep for 12-16 hours??');
  console.log(response2);

  const response3 = await sendMessage('Am i a cat, lol?? i think i have the same needs :(');
  console.log(response3);
}


chat();

