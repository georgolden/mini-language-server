import type { zodToJsonSchema } from 'zod-to-json-schema';

export type MessageHandler = (message: Message) => void;

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
  inputSchema?: ReturnType<typeof zodToJsonSchema>;
  call: (params: any) => Promise<Message>;
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

export interface IMessageComposer {
  composeMessage(content: ContentItem[], role?: 'user' | 'assistant'): Message;
}

export interface IMessageNotifier {
  notifySubscribers(message: Message): void;
  subscribe(handler: MessageHandler): () => void;
}

export interface IToolHandler {
  handleToolResponse(response: ToolResponse): Promise<string>;
}

export interface Model {
  id: string;
  name?: string;
}
