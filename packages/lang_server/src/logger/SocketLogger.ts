import { WebSocketServer } from 'ws';
import EventEmitter from 'node:events';

export class Logger extends EventEmitter {
  private wss: WebSocketServer;

  constructor(port: number = 8080) {
    super();
    this.wss = new WebSocketServer({ port });
  }

  private broadcast(level: string, message: any) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: typeof message === 'object' ? JSON.stringify(message) : message,
    };

    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(logEntry));
      }
    });
  }

  info(msg: any) {
    this.broadcast('info', msg);
  }

  error(msg: any) {
    this.broadcast('error', msg);
  }

  debug(msg: any) {
    this.broadcast('debug', msg);
  }

  warn(msg: any) {
    this.broadcast('warn', msg);
  }
}
