import OpenAI from 'openai';
import { Agent, type Message, type Tool } from './agent.mts';
import Anthropic from '@anthropic-ai/sdk';

export class ClaudeEnhancedAgent extends Agent {
  private client: Anthropic;

  constructor(systemPrompt: string, client: Anthropic, tools: Tool[] = [], memoryWindow = 10) {
    super(systemPrompt, tools, memoryWindow);
    this.client = client;
  }

  formatMessages(messages: Message[]): Anthropic.MessageCreateParamsNonStreaming {
    console.log('\n');
    console.log('INPUT:', messages);
    console.log('\n');
    return {
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 1024,
      system: this.systemPrompt,
      tools: this.tools.map((tool) => ({
        name: tool.name,
        input_schema: {
          type: 'object',
          properties: tool.inputSchema,
        },
        description: tool.description,
      })),
      messages: messages.map(({ role, content }) => ({
        role,
        content,
      })),
    };
  }

  protected override async sendToLLM(formattedMessages: any): Promise<string> {
    const response = await this.client.messages.create(formattedMessages);
    console.log('FULL FROM LLM:', response);

    return response.content[0].text;
  }
}

const claudeClient = new Anthropic({
  apiKey:
    '',
});

const agent = new ClaudeEnhancedAgent('Use small responses', claudeClient);

async function chat() {
  const response = await agent.sendMessage('Tell me about cats!');
  console.log(response);

  const response2 = await agent.sendMessage('Do cats rly sleep for 12-16 hours??');
  console.log(response2);

  const response3 = await agent.sendMessage('Am i a cat, lol?? i think i have the same needs :(');
  console.log(response3);
}

chat();
