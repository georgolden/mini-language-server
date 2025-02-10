import OpenAI from 'openai';
import type {
  ModelResponse,
  ToolResponse,
  TextResponse,
  Message,
  Tool,
} from '../types.js';
import { DEEPSEEK_API_KEY } from '../../../config/app.config.js';
import { BaseLLMChain } from '../base.agent.js';

export class DeepseekClient {
  private static instance: OpenAI;
  private constructor() {}

  public static getInstance(apiKey: string): OpenAI {
    if (!DeepseekClient.instance) {
      DeepseekClient.instance = new OpenAI({
        apiKey,
        baseURL: 'https://api.deepseek.com',
      });
    }
    return DeepseekClient.instance;
  }
}

export class DeepseekChain extends BaseLLMChain {
  private client: OpenAI;
  private model: string;

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
    // Choose model based on the simpleModel flag.
    this.model = simpleModel ? 'deepseek-chat' : 'deepseek-reasoner';
    this.client = DeepseekClient.getInstance(DEEPSEEK_API_KEY);
  }

  formatPayload(messages: Message[]): OpenAI.Chat.ChatCompletionCreateParams {
    // Map custom messages into OpenAI ChatCompletion messages.
    const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = messages.map(
      ({ role, content }) => {
        // Concatenate the various content items into a single string.
        const combinedContent = content
          .map((item) => {
            if (item.type === 'text') {
              return item.text || '';
            }
            if (item.type === 'tool_use' && item.id) {
              // Format a tool-use directive.
              return `Tool Use (${item.id}): ${item.name || ''} with input ${item.input || '{}'}`;
            }
            if (item.type === 'tool_result' && item.id) {
              // Format a tool-result.
              return `Tool Result (${item.id}): ${item.content || ''}`;
            }
            throw new Error(`Invalid content item type: ${item.type}`);
          })
          .join('\n');

        // OpenAI accepts roles "system", "user", or "assistant".
        const openaiRole: 'user' | 'assistant' =
          role === 'assistant' ? 'assistant' : 'user';
        return {
          role: openaiRole,
          content: combinedContent,
        };
      },
    );

    // Prepend a system message if provided.
    if (this.systemPrompt) {
      chatMessages.unshift({
        role: 'assistant',
        content: this.systemPrompt,
      });
    }

    return {
      model: this.model,
      tools: this.tools.map((tool) => ({
        function: {
          name: tool.name,
          parameters: tool.inputSchema,
          description: tool.description,
        },
        type: 'function',
      })),
      messages: chatMessages,
      max_tokens: 1024,
    };
  }

  protected override async sendToLLM(
    messages: Message[],
  ): Promise<ModelResponse[]> {
    const payload = this.formatPayload(messages);
    const response = await this.client.chat.completions.create(payload);
    // any cause openai has shit types :/
    const openaiMessage = (response as any)?.choices?.[0];
    console.log('OPENAI MESSAGE', response);
    const content = openaiMessage?.message?.content || '';

    if (openaiMessage.finish_reason === 'tool_calls') {
      const toolUseId = openaiMessage?.message?.tool_calls?.[0]?.id;

      return [
        {
          type: 'tool',
          toolUseId,
          toolName: openaiMessage?.message?.tool_calls?.[0]?.function?.name,
          args: JSON.parse(
            openaiMessage?.message?.tool_calls?.[0]?.function?.arguments,
          ),
        } as ToolResponse,
      ];
    }

    return [{ type: 'text', message: content } as TextResponse];
  }
}
