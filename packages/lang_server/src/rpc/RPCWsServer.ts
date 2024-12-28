import { WebSocketServer, WebSocket } from 'ws';

interface RPCRequest {
  id: string;
  method: string;
  params: any;
}

interface RPCResponse {
  id: string;
  result?: any;
  error?: string;
}

export class RPCWsServer {
  private commands = new Map<string, Function>();
  private wsServer: WebSocketServer;

  constructor(port: number) {
    this.wsServer = new WebSocketServer({ port });
    this.wsServer.on('connection', this.handleConnection.bind(this));
  }

  registerCommand(name: string, handler: Function) {
    this.commands.set(name, handler);
  }

  private handleConnection(ws: WebSocket) {
    ws.on('message', async (data: Buffer) => {
      try {
        const { id, method, params } = JSON.parse(data.toString()) as RPCRequest;
        const handler = this.commands.get(method);

        if (!handler) {
          const response: RPCResponse = { id, error: `Method ${method} not found` };
          ws.send(JSON.stringify(response));
          return;
        }

        const result = await handler(params);
        const response: RPCResponse = { id, result };
        ws.send(JSON.stringify(response));
      } catch (error) {
        const response: RPCResponse = {
          id: (JSON.parse(data.toString()) as RPCRequest).id,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
        ws.send(JSON.stringify(response));
      }
    });
  }

  close() {
    this.wsServer.close();
  }
}
