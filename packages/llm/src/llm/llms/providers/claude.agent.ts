import Anthropic from '@anthropic-ai/sdk';
import type {
  ModelResponse,
  ToolResponse,
  TextResponse,
  Message,
  Tool,
} from '../types.js';
import { ANTHROPIC_API } from '../../../config/app.config.js';
import type {
  Model,
  Tool as AnthropicTool,
} from '@anthropic-ai/sdk/resources/index.mjs';
import { BaseLLMChain } from '../base.agent.js';
import { Model as ChatModel } from '../types.js';

export class AnthropicClient {
  private static instance: Anthropic;
  private constructor() {}

  public static async getModels(): Promise<ChatModel[]> {
    const models: { id: Model; name: string }[] = [
      {
        id: 'claude-3-5-haiku-latest',
        name: 'Claude Haiku',
      },
      {
        id: 'claude-3-5-sonnet-latest',
        name: 'Claude Sonnet',
      },
    ];
    return models;
  }

  public static getInstance(): Anthropic {
    if (!AnthropicClient.instance) {
      AnthropicClient.instance = new Anthropic({ apiKey: ANTHROPIC_API });
    }
    return AnthropicClient.instance;
  }
}

export class ClaudeChain extends BaseLLMChain {
  private client: Anthropic;
  private model: Model;

  constructor({
    systemPrompt,
    tools = [],
    simpleModel = false,
  }: {
    systemPrompt?: string;
    tools?: Tool[];
    simpleModel?: boolean;
  }) {
    super({ systemPrompt, tools });
    this.model = simpleModel
      ? 'claude-3-5-haiku-latest'
      : 'claude-3-5-sonnet-latest';
    this.client = AnthropicClient.getInstance();
  }

  formatPayload(
    messages: Message[],
  ): Anthropic.MessageCreateParamsNonStreaming {
    const tools: AnthropicTool[] = this.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema as any,
    }));

    const formattedMessages: Anthropic.Messages.MessageParam[] = messages.map(
      ({ role, content }) => ({
        role,
        content: content.map((item): Anthropic.Messages.ContentBlockParam => {
          if (item.type === 'text') {
            return { type: 'text', text: item.text || '' };
          }
          if (item.type === 'tool_result' && item.id) {
            return {
              type: 'tool_result',
              tool_use_id: item.id,
              content: item.content || '',
            };
          }
          if (item.type === 'tool_use' && item.id) {
            return {
              type: 'tool_use',
              id: item.id,
              name: item.name || '',
              input: JSON.parse(item.input || '{}'),
            };
          }
          throw new Error(`Invalid content item type: ${item.type}`);
        }),
      }),
    );

    return {
      model: this.model,
      max_tokens: 1024,
      system: this.systemPrompt,
      tools,
      messages: formattedMessages,
    };
  }

  protected override async sendToLLM(
    messages: Message[],
  ): Promise<ModelResponse[]> {
    const response = await this.client.messages.create(
      this.formatPayload(messages),
    );

    return response.content.flatMap((content): ModelResponse => {
      if (content.type === 'tool_use') {
        return {
          type: 'tool',
          toolUseId: content.id,
          toolName: content.name,
          args: content.input,
        } as ToolResponse;
      }
      if (content.type === 'text') {
        return { type: 'text', message: content.text } as TextResponse;
      }
    });
  }
}
