import WebSocket from 'ws';

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

export class RPCWsClient {
  ws: WebSocket;
  private requestMap = new Map<string, { resolve: Function; reject: Function }>();

  constructor(port: number) {
    this.ws = new WebSocket(`ws://localhost:${port}`);

    this.ws.on('message', (data: Buffer) => {
      const response = JSON.parse(data.toString()) as RPCResponse;
      const pending = this.requestMap.get(response.id);

      if (pending) {
        if (response.error) {
          pending.reject(new Error(response.error));
        } else {
          pending.resolve(response.result);
        }
        this.requestMap.delete(response.id);
      }
    });
  }

  async call(method: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).slice(2);
      const request: RPCRequest = { id, method, params };

      this.requestMap.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(request));
    });
  }

  close() {
    this.ws.close();
  }
}
