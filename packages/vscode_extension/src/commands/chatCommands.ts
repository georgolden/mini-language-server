import { Command } from './types';
import { ChatService } from '../services/ChatService';

export function createChatCommands(chatService: ChatService): Command[] {
  return [
    {
      id: 'miniLanguageServer.openChat',
      title: 'Open Chat',
      handler: async () => {
        chatService.openChat();
      }
    },
    {
      id: 'miniLanguageServer.openMenu',
      title: 'Open Menu',
      handler: async () => {
        chatService.openMenu();
      }
    }
  ];
}
