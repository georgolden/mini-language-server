import { Chat, Message } from '../dto/chat.types.js';

export interface PubSubEvents {
  [key: string]: unknown;
  chatCreated: { chatCreated: Chat };
  messageCreated: { messageCreated: Message; chatId: number };
}
