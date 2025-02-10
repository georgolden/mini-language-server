import { Mistral } from '@mistralai/mistralai';
import type {
  ModelResponse,
  ToolResponse,
  TextResponse,
  Message,
  Tool,
} from '../types.js';
import { XAI_API_KEY } from '../../../config/app.config.js';
import { BaseLLMChain } from '../base.agent.js';

export class MistralAIClient {
  private static instance: Mistral;
  private constructor() {}

  public static getInstance(apiKey: string): Mistral {
    if (!MistralAIClient.instance) {
      MistralAIClient.instance = new Mistral({
        apiKey,
      });
    }
    return MistralAIClient.instance;
  }
}

export class MistralChain extends BaseLLMChain {
  private client: Mistral;
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
    // a lot of models by mistral with function capabilities
    // worth exploring
    this.model = simpleModel ? 'mistral-large-latest' : 'ministral-3b-latest';
    this.client = MistralAIClient.getInstance(XAI_API_KEY);
  }

  formatPayload(
    messages: Message[],
  ): Parameters<Mistral['chat']['complete']>[0] {
    // Map custom messages into OpenAI ChatCompletion messages.
    const chatMessages: Parameters<Mistral['chat']['complete']>[0]['messages'] =
      messages.map(({ role, content }) => {
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
      });

    // Prepend a system message if provided.
    if (this.systemPrompt) {
      chatMessages.unshift({
        role: 'assistant',
        content: this.systemPrompt,
      });
    }

    return {
      model: this.model,
      maxTokens: 1024,
      tools: this.tools.map((tool) => ({
        function: {
          name: tool.name,
          parameters: tool.inputSchema,
          description: tool.description,
        },
        type: 'function',
      })),
      messages: chatMessages,
    };
  }

  protected override async sendToLLM(
    messages: Message[],
  ): Promise<ModelResponse[]> {
    const payload = this.formatPayload(messages);
    const response = await this.client.chat.complete(payload);
    const mistralMessage = response?.choices?.[0];
    const content = mistralMessage?.message?.content || '';

    if (mistralMessage.finishReason === 'tool_calls') {
      const toolUseId = mistralMessage?.message?.toolCalls?.[0]?.id;

      return [
        {
          type: 'tool',
          toolUseId,
          toolName: mistralMessage?.message?.toolCalls?.[0]?.function?.name,
          args:
            typeof mistralMessage?.message?.toolCalls?.[0]?.function
              ?.arguments === 'string'
              ? JSON.parse(
                  mistralMessage?.message?.toolCalls?.[0]?.function?.arguments,
                )
              : mistralMessage?.message?.toolCalls?.[0]?.function?.arguments,
        } as ToolResponse,
      ];
    }

    return [{ type: 'text', message: content } as TextResponse];
  }
}
