import Groq from 'groq-sdk';
import type {
  ModelResponse,
  ToolResponse,
  TextResponse,
  Message,
  Tool,
} from '../types.js';
import { GROQ_API_KEY } from '../../../config/app.config.js';
import { BaseLLMChain } from '../base.agent.js';
import { ChatCompletionCreateParamsNonStreaming } from 'groq-sdk/resources/chat/completions.mjs';
import { Model } from '../types.js';

export class GroqClient {
  private static instance: Groq;
  private constructor() {}

  public static async getModels(): Promise<Model[]> {
    const models: {
      id: ChatCompletionCreateParamsNonStreaming['model'];
      name: string;
    }[] = [
      { id: 'deepseek-r1-distill-llama-70b', name: 'Llama 3 70b + R1' },
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70b' },
      { id: 'deepseek-r1-distill-qwen-32b	', name: 'Qwen 32B + R1' },
      { id: 'qwen-2.5-32b	', name: 'Qwen 32B' },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B' },
    ];
    return models;
  }

  public static getInstance(): Groq {
    if (!GroqClient.instance) {
      GroqClient.instance = new Groq({ apiKey: GROQ_API_KEY });
    }
    return GroqClient.instance;
  }
}

export class GroqChain extends BaseLLMChain {
  private client: Groq;
  private model: ChatCompletionCreateParamsNonStreaming['model'];

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
    this.model = simpleModel
      ? 'llama-3.3-70b-versatile'
      : 'deepseek-r1-distill-llama-70b';
    this.client = GroqClient.getInstance();
  }

  formatPayload(messages: Message[]): ChatCompletionCreateParamsNonStreaming {
    const chatMessages: Groq.Chat.ChatCompletionMessageParam[] = messages.map(
      ({ role, content }) => {
        const combinedContent = content
          .map((item) => {
            if (item.type === 'text') {
              return item.text || '';
            }
            if (item.type === 'tool_use' && item.id) {
              return `Tool Use (${item.id}): ${item.name || ''} with input ${item.input || '{}'}`;
            }
            if (item.type === 'tool_result' && item.id) {
              return `Tool Result (${item.id}): ${item.content || ''}`;
            }
            throw new Error(`Invalid content item type: ${item.type}`);
          })
          .join('\n');

        const groqRole: 'user' | 'assistant' =
          role === 'assistant' ? 'assistant' : 'user';
        return {
          role: groqRole,
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
    const groqMessage = response?.choices?.[0];
    const content = groqMessage?.message?.content || '';

    if (groqMessage.finish_reason === 'tool_calls') {
      const toolUseId = groqMessage?.message?.tool_calls?.[0]?.id;

      return [
        {
          type: 'tool',
          toolUseId,
          toolName: groqMessage?.message?.tool_calls?.[0]?.function?.name,
          args: JSON.parse(
            groqMessage?.message?.tool_calls?.[0]?.function?.arguments,
          ),
        } as ToolResponse,
      ];
    }

    return [{ type: 'text', message: content } as TextResponse];
  }
}
