import { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";

export enum ConnectionState {
  DISCONNECTED,
  CONNECTING,
  CONNECTED,
  CLOSED,
}

export interface WSEvents {
  onclose?: () => void;
  onerror?: (error: WSError) => void;
  onmessage?: (message: JSONRPCMessage) => void;
}

export class WSError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'WSError';
  }
}
