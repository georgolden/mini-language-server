import type { zodToJsonSchema } from 'zod-to-json-schema';

export interface Message {
  role: 'user' | 'assistant';
  content: string | ContentItem[];
  timestamp: Date;
}

interface ContentItem {
  type: 'text' | 'tool_use' | 'tool_result';
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, any>;
  content?: string;
}

export interface Tool {
  name: string;
  description?: string;
  inputSchema: ReturnType<typeof zodToJsonSchema>;
  call: (params: any) => Promise<any>;
}

export type ModelResponse = ToolResponse | TextResponse;

export interface ToolResponse {
  type: 'tool';
  toolUseId: string;
  toolName: string;
  args: Record<any, any>;
}

export interface TextResponse {
  type: 'text';
  message: string;
}

export abstract class Agent {
  protected systemPrompt: string;
  protected memoryWindow: number;
  protected history: Message[];
  protected tools: Tool[];

  constructor(systemPrompt: string, tools: Tool[] = [], memoryWindow = 10) {
    this.systemPrompt = systemPrompt;
    this.tools = tools;
    this.history = [];
    this.memoryWindow = memoryWindow;
  }

  protected addMessage(message: Message): void {
    this.history.push(message);
  }

  private composeMessage(
    content: Message['content'],
    role: 'user' | 'assistant' = 'user',
  ): Message {
    const message = {
      role,
      content,
      timestamp: new Date(),
    };

    this.addMessage(message);

    return message;
  }

  async sendMessage(
    prompt: string | { type: 'tool_result'; tool_use_id: string; content: string },
  ): Promise<string> {
    const context = this.history.slice(-this.memoryWindow);

    const userMessage =
      typeof prompt === 'string'
        ? this.composeMessage(prompt)
        : this.composeMessage([
            {
              type: 'tool_result',
              id: prompt.tool_use_id,
              content: prompt.content,
            },
          ]);

    const formattedMessages = this.formatMessages([...context, userMessage]);
    const response = await this.sendToLLM(formattedMessages);

    const contentArray: ContentItem[] = [];
    let hasToolCall = false;

    for (const message of response) {
      if (message.type === 'text') {
        contentArray.push({
          type: 'text',
          text: message.message,
        });
      }
      if (message.type === 'tool') {
        hasToolCall = true;
        contentArray.push({
          type: 'tool_use',
          id: message.toolUseId,
          name: message.toolName,
          input: message.args,
        });

        const tool = this.tools.find((tool) => tool.name === message.toolName);
        if (!tool) throw new Error('Unknown tool!');

        const toolResult = await tool.call(message.args);

        // Save current state to history only once
        this.composeMessage(contentArray, 'assistant');

        // Then do the follow-up call
        await this.sendMessage({
          type: 'tool_result',
          tool_use_id: message.toolUseId,
          content: toolResult.content[0]?.text,
        });

        return;
      }
    }

    // Only save to history if we haven't done a tool call
    if (!hasToolCall && contentArray.length > 0) {
      this.composeMessage(contentArray, 'assistant');
    }
  }

  clearMemory(): void {
    this.history = [];
  }

  updateSystemPrompt(newPrompt: string): void {
    this.systemPrompt = newPrompt;
  }

  abstract formatMessages(messages: Message[], enhancedSystemPrompt?: string): unknown;

  protected abstract sendToLLM(formattedMessages: unknown): Promise<ModelResponse[]>;
}
