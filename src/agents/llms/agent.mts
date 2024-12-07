import type { zodToJsonSchema } from 'zod-to-json-schema';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
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
  toolName: string;
  args: string[];
}

export interface TextResponse {
  type: 'text';
  message: string;
}

export abstract class Agent {
  protected systemPrompt: string;
  protected memoryWindow: number;
  protected history: Message[] = [];
  protected tools: Tool[];

  constructor(systemPrompt: string, tools: Tool[] = [], memoryWindow = 10) {
    this.systemPrompt = systemPrompt;
    this.tools = tools;
    this.memoryWindow = memoryWindow;
  }

  protected addMessage(message: Message): void {
    this.history.push(message);
  }

  async sendMessage(prompt: string): Promise<string> {
    const context = this.history.slice(-this.memoryWindow);

    const userMessage: Message = {
      role: 'user',
      content: prompt,
      timestamp: new Date(),
    };

    const formattedMessages = this.formatMessages([...context, userMessage]);

    const response = await this.sendToLLM(formattedMessages);

    for (const message of response) {

      if (message.type === 'text') {

        this.addMessage(userMessage);
        this.addMessage({
          role: 'assistant',
          content: message.message,
          timestamp: new Date()
        });

        return message.message;
      }

      if (message.type === 'tool') {
        // call tool
      }

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
