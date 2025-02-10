import { zodToJsonSchema } from 'zod-to-json-schema';
import type { Tool } from '../llms/types.js';
import z from 'zod';
import { GPTChain } from '../llms/providers/openai.agent.js';

const messageSchema = z.object({
  conversation: z.string().describe('Raw conversation text to analyze'),
});

const summaryAgent = async () => {
  const topicAnalyzer = new GPTChain({
    systemPrompt: `You are a topic analysis specialist. Extract the main topic from conversations. Use tools to generate comprehansive summary.
Return only the primary topic as a brief phrase without explanation.`,
    tools: [],
    simpleModel: true,
  });

  const summaryGenerator = new GPTChain({
    systemPrompt: `You are a conversation summarizer. Generate a brief 2-3 sentence summary.
Return only the summary without commentary.`,
    tools: [],
    simpleModel: true,
  });

  const tools: Tool[] = [
    {
      call: async ({ conversation }: { conversation: string }) => {
        const result = await topicAnalyzer.sendMessage({
          type: 'text',
          text: conversation,
        });

        return {
          role: 'assistant',
          name: 'get_topic',
          timestamp: new Date(),
          content: [
            {
              type: 'text',
              text: result,
            },
          ],
        };
      },
      name: 'get_topic',
      inputSchema: zodToJsonSchema(messageSchema),
      description: 'Analyzes conversation to identify main topic',
    },
    {
      call: async ({
        conversation,
        topic,
      }: { conversation: string; topic: string }) => {
        const result = await summaryGenerator.sendMessage({
          type: 'text',
          text: `Topic: ${topic}\n\nConversation:\n${conversation}`,
        });

        return {
          role: 'assistant',
          name: 'get_summary',
          timestamp: new Date(),
          content: [
            {
              type: 'text',
              text: result,
            },
          ],
        };
      },
      name: 'get_summary',
      inputSchema: zodToJsonSchema(
        messageSchema.extend({
          topic: z.string().describe('Identified topic'),
        }),
      ),
      description: 'Generates summary based on conversation and topic',
    },
  ];

  const chat = new GPTChain({
    systemPrompt: `You are a conversation analysis assistant that summarizes discussions.
Follow this sequence:
1. Use get_topic to identify the main topic
2. Use get_summary to generate a final summary
3. Return the summary as plain text`,
    tools,
    simpleModel: true,
  });

  return chat;
};

const testConversation = `[USER]: Hi! I need help setting up a new React project for my portfolio website

[ASSISTANT]: Of course! Let's create a new React project. What package manager do you prefer - npm or yarn?

[USER]: I'll use npm. Also, I want to use Tailwind CSS for styling

[ASSISTANT]: Great choice! Here's the sequence of commands you'll need:
1. npx create-react-app portfolio
2. cd portfolio
3. npm install -D tailwindcss postcss autoprefixer
4. npx tailwindcss init -p

[USER]: Thanks! What components should I create first for the portfolio?

[ASSISTANT]: For a portfolio site, I'd recommend starting with:
1. Header/Navigation
2. Hero section
3. Projects grid
4. About me section
5. Contact form

Which one would you like to work on first?

[USER]: Let's start with the Hero section. Can you show me a basic example?

[ASSISTANT]: Here's a simple Hero component using Tailwind:

\`\`\`jsx
function Hero() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Your Name</h1>
        <p className="mt-4 text-xl">Frontend Developer</p>
      </div>
    </div>
  );
}
\`\`\`

Would you like to customize this further?

[USER]: This looks good! I'll implement this and come back if I need help with styling`;

(async () => {
  const agentInstance = await summaryAgent();

  agentInstance.subscribe(console.log);
  agentInstance.sendMessage({
    type: 'text',
    text: `Summarize ${testConversation}`,
  });
})();

export { summaryAgent };
