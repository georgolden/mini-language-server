import { WebSocketServer } from 'ws';
import EventEmitter from 'node:events';

export class Logger extends EventEmitter {
  private wss: WebSocketServer;

  constructor(port = 8080) {
    super();
    this.wss = new WebSocketServer({ port });
  }

  private broadcast(level: string, message: unknown) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: typeof message === 'object' ? JSON.stringify(message, null, 2) : message,
    };

    for (const client of this.wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(logEntry));
      }
    }
  }

  info(msg: unknown) {
    this.broadcast('info', msg);
  }

  error(msg: unknown) {
    this.broadcast('error', msg);
  }

  debug(msg: unknown) {
    this.broadcast('debug', msg);
  }

  warn(msg: unknown) {
    this.broadcast('warn', msg);
  }
}
