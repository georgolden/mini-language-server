import Anthropic from '@anthropic-ai/sdk';
import {
  Agent,
  type ModelResponse,
  type ToolResponse,
  type TextResponse,
  type Message,
  type Tool,
} from './base.agent.js';

export class ClaudeEnhancedAgent extends Agent {
  private client: Anthropic;
  private model: Anthropic.Model;

  constructor({
    systemPrompt,
    client,
    tools = [],
    memoryWindow = 100,
    simpleModel = false,
  }: {
    systemPrompt?: string;
    client: Anthropic;
    tools?: Tool[];
    memoryWindow?: number;
    simpleModel?: boolean;
  }) {
    super({ systemPrompt, tools, memoryWindow });
    this.model = simpleModel
      ? 'claude-3-5-haiku-latest'
      : 'claude-3-5-sonnet-latest';
    this.client = client;
  }

  getMessages() {
    return this.history;
  }

  formatMessages(
    messages: Message[],
  ): Anthropic.MessageCreateParamsNonStreaming {
    return {
      model: this.model,
      max_tokens: 1024,
      system: this.systemPrompt,
      //@ts-ignore
      tools: this.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema,
      })),
      //@ts-ignore
      messages: messages.map(({ role, content }) => {
        if (Array.isArray(content)) {
          return {
            role,
            content: content.map((item) => {
              if (item.type === 'text') {
                return { type: 'text', text: item.text };
              }
              if (item.type === 'tool_result') {
                return {
                  type: 'tool_result',
                  tool_use_id: item.id,
                  content: item.content,
                };
              }
              return item;
            }),
          };
        }
        return { role, content };
      }),
    };
  }

  protected override async sendToLLM(
    formattedMessages: ReturnType<typeof this.formatMessages>,
  ): Promise<ModelResponse[]> {
    const response = await this.client.messages.create(formattedMessages);

    const output = response.content.flatMap((content) => {
      if (content.type === 'tool_use') {
        return {
          type: 'tool',
          toolUseId: content.id,
          toolName: content.name,
          args: content.input || {},
        } satisfies ToolResponse;
      }
      if (content.type === 'text') {
        return { type: 'text', message: content.text } satisfies TextResponse;
      }
      return [];
    });

    console.log(output);

    return output;
  }
}

export const createClaudeClient = (apiKey: string) =>
  new Anthropic({
    apiKey,
  });
