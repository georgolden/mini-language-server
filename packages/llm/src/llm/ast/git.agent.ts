import { zodToJsonSchema } from 'zod-to-json-schema';
import { Tool } from '../llms/types.js';
import z from 'zod';
import { GPTChain } from '../llms/providers/openai.agent.js';

const getRandomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const cowSaySchema = z.object({
  word: z.string().describe('Word for cow to say'),
});
const randomNumberSchema = z.object({});

const codeAgent = async () => {
  const ASTSystemPrompt = '';
  //'You are a code-focused AI assistant. Follow this exact tool usage sequence: ' +
  //'1. Start with get_project_files to map the project structure ' +
  //'2. Use summarize_files_content on discovered files to understand codebase ' +
  //'3. Identify relevant code locations based on summaries ' +
  //'4. Use get_simple_tree on identified locations toget code structure ' +
  //'5. Before writing any code, use get_available_symbols to check available ' +
  //'   functions, classes, and variables at the target location ' +
  //'6. Prioritize using existing code and symbols over writing new ones ' +
  //'7. If existing code needs modification, use insert_code to update it ' +
  //'8. Only create new files and write new code if nothing suitable exists ' +
  //'Use tools precisely and only for coding tasks. ' +
  //'Ask specific follow-up questions when information is insufficient. ' +
  //'Respond with "NO" to non-coding requests. ' +
  //'Never skip steps or make assumptions - follow the sequence exactly.';

  const tools: Tool[] = [
    {
      call: async () => {
        return {
          role: 'user',
          name: 'randomNumber',
          timestamp: new Date(),
          content: [
            {
              text: getRandomInt(0, 1000).toString(),
              type: 'text',
            },
          ],
        };
      },
      name: 'randomNumber',
      inputSchema: zodToJsonSchema(randomNumberSchema),
      // description is important!!!
      description: 'Generates random number.',
    },
    {
      call: async ({ word }) => {
        return {
          role: 'user',
          timestamp: new Date(),
          name: 'cowSay',
          content: [
            {
              text: `Moo~${word}`,
              type: 'text',
            },
          ],
        };
      },
      name: 'cowSay',
      inputSchema: zodToJsonSchema(cowSaySchema),
      // description is important!!!
      description: 'Attaches "Moo~" to the begining of input string.',
    },
  ];

  const chat = new GPTChain({
    systemPrompt: ASTSystemPrompt,
    tools,
    simpleModel: true,
  });

  return chat;
};

// uncomment for testing
(async () => {
  const instance = await codeAgent();

  instance.subscribe(console.log);
  instance.sendMessage({
    type: 'text',
    text: 'Get sum of 2 random numbers',
  });
})();
