import type { zodToJsonSchema } from 'zod-to-json-schema';

type MessageHandler = (message: Message) => void;

export interface Message {
  role: 'user' | 'assistant';
  content: ContentItem[];
  timestamp: Date;
}

export interface ContentItem {
  type: 'text' | 'tool_use' | 'tool_result';
  text?: string;
  id?: string;
  name?: string;
  input?: string;
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

interface IMessageComposer {
  composeMessage(content: ContentItem[], role?: 'user' | 'assistant'): Message;
}

interface IMessageNotifier {
  notifySubscribers(message: Message): void;
  subscribe(handler: MessageHandler): () => void;
}

interface IToolHandler {
  handleToolResponse(response: ToolResponse): Promise<string>;
}

class MessageComposer implements IMessageComposer {
  composeMessage(
    content: ContentItem[],
    role: 'user' | 'assistant' = 'user',
  ): Message {
    return {
      role,
      content,
      timestamp: new Date(),
    };
  }
}

class MessageNotifier implements IMessageNotifier {
  private messageSubscribers: Set<MessageHandler>;

  constructor() {
    this.messageSubscribers = new Set();
  }

  notifySubscribers(message: Message): void {
    for (const handler of this.messageSubscribers) {
      handler(message);
    }
  }

  subscribe(handler: MessageHandler): () => void {
    this.messageSubscribers.add(handler);
    return () => this.messageSubscribers.delete(handler);
  }
}

class ToolHandler implements IToolHandler {
  constructor(private tools: Tool[]) {}

  async handleToolResponse(response: ToolResponse): Promise<string> {
    const tool = this.tools.find((t) => t.name === response.toolName);
    if (!tool) throw new Error(`Unknown tool: ${response.toolName}`);

    const result = await tool.call(response.args);
    return result.content[0]?.text ?? '';
  }
}

export abstract class Agent {
  protected systemPrompt: string;
  protected tools: Tool[];
  private messageComposer: IMessageComposer;
  private messageNotifier: IMessageNotifier;
  private toolHandler: IToolHandler;

  constructor({
    systemPrompt,
    tools = [],
  }: { systemPrompt?: string; tools?: Tool[] }) {
    this.systemPrompt = systemPrompt;
    this.tools = tools;
    this.messageComposer = new MessageComposer();
    this.messageNotifier = new MessageNotifier();
    this.toolHandler = new ToolHandler(tools);
  }

  subscribe(handler: MessageHandler): () => void {
    return this.messageNotifier.subscribe(handler);
  }

  protected notifySubscribers(message: Message): void {
    this.messageNotifier.notifySubscribers(message);
  }

  async sendMessage(
    prompt: ContentItem,
    providedHistory: Message[] = [],
  ): Promise<string> {
    const userMessage = this.messageComposer.composeMessage([prompt]);
    this.notifySubscribers(userMessage);

    const messages = [...providedHistory, userMessage];
    const responses = await this.sendToLLM(messages);

    return this.processResponses(responses);
  }

  private async processResponses(responses: ModelResponse[]): Promise<string> {
    const contentArray: ContentItem[] = [];

    for (const response of responses) {
      if (response.type === 'text') {
        contentArray.push({ type: 'text', text: response.message });
        continue;
      }

      if (response.type === 'tool') {
        const toolResult = await this.handleToolResponse(response);
        if (toolResult) return toolResult;
      }
    }

    if (contentArray.length > 0) {
      const assistantMessage = this.messageComposer.composeMessage(
        contentArray,
        'assistant',
      );
      this.notifySubscribers(assistantMessage);
      return this.getLastTextContent(contentArray);
    }

    return '';
  }

  private async handleToolResponse(
    response: ToolResponse,
  ): Promise<string | undefined> {
    const toolUseContent: ContentItem = {
      type: 'tool_use',
      id: response.toolUseId,
      name: response.toolName,
      input: JSON.stringify(response.args),
    };

    const assistantMessage = this.messageComposer.composeMessage(
      [toolUseContent],
      'assistant',
    );
    this.notifySubscribers(assistantMessage);

    const toolResult = await this.toolHandler.handleToolResponse(response);

    return this.sendMessage({
      type: 'tool_result',
      id: response.toolUseId,
      content: toolResult,
    });
  }

  private getLastTextContent(content: ContentItem[]): string {
    const lastText = content.filter((item) => item.type === 'text').pop();
    return lastText?.text ?? '';
  }

  updateSystemPrompt(newPrompt: string): void {
    this.systemPrompt = newPrompt;
  }

  protected abstract sendToLLM(messages: Message[]): Promise<ModelResponse[]>;
}
