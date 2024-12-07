import Anthropic from '@anthropic-ai/sdk';
import { Agent, ModelResponse, ToolResponse, type Message, type Tool } from './agent.mjs';

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

  protected override async sendToLLM(formattedMessages: ReturnType<typeof this.formatMessages>): Promise<ModelResponse[]> {
    const response = await this.client.messages.create(formattedMessages);
    console.log('FULL FROM LLM:', response);

    const output = response.content.map((content) => {
      if (content.type === 'tool_use') {
        console.log(content.input)
        return { type: 'tool', toolName: content.name, args: [] } as ToolResponse
      } else if (content.type === 'text') {
        return { type: 'text', message: content.text } as ModelResponse
      }
      return []
    }).flat()

    return output;
  }
}

export const claudeClient = new Anthropic({
  apiKey: process.env.ANTHROPIC_API,
});
