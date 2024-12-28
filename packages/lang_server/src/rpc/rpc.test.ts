import tap from 'tap';
import { RPCWsServer } from './RPCWsServer.js';
import { RPCWsClient } from './RPCWsClient.js';

tap.test('RPC WebSocket Server/Client', async (t) => {
  const server = new RPCWsServer(3003);
  const client = new RPCWsClient(3003);

  // Wait for connection to be established
  await new Promise<void>((resolve) => {
    client.ws.on('open', () => resolve());
  });

  server.registerCommand('add', (params: { a: number; b: number }) => {
    return params.a + params.b;
  });

  server.registerCommand('echo', (params: string) => {
    return params;
  });

  t.test('should handle successful RPC calls', async (t) => {
    const result = await client.call('add', { a: 5, b: 3 });
    t.equal(result, 8);

    const echo = await client.call('echo', 'hello');
    t.equal(echo, 'hello');
  });

  t.test('should handle RPC errors', async (t) => {
    try {
      await client.call('nonexistent', {});
      t.fail('Should throw error');
    } catch (error) {
      const err = error as Error;
      t.match(err.message, /Method.*not found/);
    }
  });

  t.teardown(() => {
    client.close();
    server.close();
  });
});
