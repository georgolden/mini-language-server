import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import { WSError } from './types.js';

export class MessageHandler {
  validateMessage(data: unknown): data is JSONRPCMessage {
    if (!data || typeof data !== 'object') return false;
    // Add JSON-RPC message validation logic
    return true;
  }

  async handleMessage(data: unknown): Promise<JSONRPCMessage> {
    try {
      const message = JSON.parse(data as string);
      
      if (!this.validateMessage(message)) {
        throw new WSError('Invalid message format', 'INVALID_MESSAGE');
      }

      return message;
    } catch (error) {
      const err = error as Error;
      throw new WSError(
        `Message parsing failed: ${err.message}`, 
        'MESSAGE_PARSE_ERROR'
      );
    }
  }}
