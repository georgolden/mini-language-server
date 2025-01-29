import {
  Message,
  Tool,
  ContentItem,
  ModelResponse,
  ToolResponse,
  IMessageComposer,
  IToolHandler,
  MessageHandler,
  IMessageNotifier,
} from './types.js';

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

    const result = await tool.call(response?.args);
    return result.content[0]?.text ?? '';
  }
}

export abstract class BaseLLMChain {
  protected systemPrompt: string;
  protected tools: Tool[];
  private messageComposer: IMessageComposer;
  private messageNotifier: IMessageNotifier;
  private toolHandler: IToolHandler;
  private history: Message[];
  private historyLimit: number;

  // number of user prompts untill history is purged
  private historyLimitNatural?: number;

  constructor({
    systemPrompt,
    tools = [],
  }: { systemPrompt?: string; tools?: Tool[] }) {
    this.systemPrompt = systemPrompt;
    this.tools = tools;
    this.messageComposer = new MessageComposer();
    this.messageNotifier = new MessageNotifier();
    this.toolHandler = new ToolHandler(tools);
    this.history = [];
    this.historyLimit = 30;
  }

  subscribe(handler: MessageHandler): () => void {
    return this.messageNotifier.subscribe(handler);
  }

  protected notifySubscribers(message: Message): void {
    this.history.push(message);
    this.messageNotifier.notifySubscribers(message);
  }

  private getMessagesUntilNthUserText(): Message[] {
    let userTextCount = 0;

    for (let i = this.history.length - 1; i >= 0; i--) {
      const message = this.history[i];

      if (
        message.role === 'user' &&
        message.content.some((item) => item.type === 'text')
      ) {
        userTextCount++;

        if (userTextCount === this.historyLimitNatural) {
          return this.history.slice(i);
        }
      }
    }

    return this.history;
  }

  async sendMessage(prompt: ContentItem): Promise<string> {
    const userMessage = this.messageComposer.composeMessage([prompt]);
    this.notifySubscribers(userMessage);

    const history: Message[] = this.historyLimitNatural
      ? this.getMessagesUntilNthUserText()
      : this.history.slice(
          this.history.length - this.historyLimit,
          this.history.length,
        );

    const messages = history;
    const responses = await this.sendToLLM(messages);

    return this.processResponses(responses);
  }

  public setHistory(history: Message[]) {
    this.history = history;
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
