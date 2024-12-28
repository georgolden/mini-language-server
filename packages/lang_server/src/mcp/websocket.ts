import { WebSocket, WebSocketServer } from 'ws';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import { randomUUID } from 'node:crypto';
import { ConnectionState, WSError, WSEvents } from './types.js';
import { MessageHandler } from './MessageHandler.js';

export class WebSocketServerTransport implements Transport {
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private wss?: WebSocketServer;
  private ws?: WebSocket;
  private readonly sessionId: string;
  private readonly messageHandler: MessageHandler;

  constructor(private readonly port: number) {
    this.sessionId = randomUUID();
    this.messageHandler = new MessageHandler();
  }

  async start(): Promise<void> {
    if (this.state !== ConnectionState.DISCONNECTED) {
      return;
    }

    this.state = ConnectionState.CONNECTING;

    this.wss = new WebSocketServer({ port: this.port });

    return new Promise((resolve) => {
      this.wss!.on('connection', (ws) => {
        this.ws = ws;
        this.state = ConnectionState.CONNECTED;

        ws.on('message', async (data) => {
          const message = await this.messageHandler.handleMessage(data);
          (this as WSEvents).onmessage?.(message);
        });
        ws.on('close', () => {
          this.state = ConnectionState.DISCONNECTED;
          (this as WSEvents).onclose?.();
        });

        ws.on('error', (error) => {
          (this as WSEvents).onerror?.(new WSError(error.message, 'CONNECTION_ERROR'));
        });

        resolve();
      });
    });
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (this.state !== ConnectionState.CONNECTED || !this.ws) {
      throw new WSError('No active connection', 'NO_CONNECTION');
    }

    this.ws.send(JSON.stringify(message));
  }

  async close(): Promise<void> {
    this.ws?.close();
    await new Promise<void>((resolve) => this.wss?.close(() => resolve()));
    this.state = ConnectionState.CLOSED;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getState(): ConnectionState {
    return this.state;
  }
}
