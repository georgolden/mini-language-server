import { type WebSocket, WebSocketServer } from 'ws';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import type { Logger } from '../logger/SocketLogger.js';
import type { Server } from 'node:http';
import { randomUUID } from 'node:crypto';

export class WebSocketServerTransport implements Transport {
  private _wss?: WebSocketServer;
  private _ws?: WebSocket;
  private _sessionId: string;
  private logger: Logger;

  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;

  constructor(port: number, logger: Logger) {
    this._sessionId = randomUUID();
    this._wss = new WebSocketServer({ port });
    this.logger = logger;
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this._wss) {
        reject(new Error('WebSocket server not initialized'));
        return;
      }
      console.log('websocket init');

      this._wss.on('connection', (ws) => {
        console.log('ABOBA');
        this._ws = ws;
        this.logger?.info('New client connected! ^_^');

        ws.on('message', async (data) => {
          try {
            const message = JSON.parse(data.toString());
            this.logger?.debug(message);
            console.log(message);
            await this.handleMessage(message);
          } catch (error) {
            this.logger?.error(error);
            this.onerror?.(error as Error);
          }
        });

        ws.on('close', () => {
          this.logger?.info('Client disconnected >_<');
          this.onclose?.();
        });

        ws.on('error', (error) => {
          this.logger?.error(error);
          this.onerror?.(error);
        });

        resolve();
      });

      this._wss.on('error', (error) => {
        this.logger?.error(error);
        reject(error);
      });
    });
  }

  async handleMessage(message: unknown): Promise<void> {
    if (this.onmessage) {
      await this.onmessage(message as JSONRPCMessage);
    }
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (!this._ws) {
      throw new Error('No WebSocket connection established');
    }

    return new Promise((resolve, reject) => {
      this._ws!.send(JSON.stringify(message), (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  async close(): Promise<void> {
    this._ws?.close();
    this._wss?.close();
  }

  get sessionId(): string {
    return this._sessionId;
  }
}
