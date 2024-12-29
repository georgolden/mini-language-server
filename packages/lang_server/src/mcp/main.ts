import { FSManager } from './FSManager.js';
import { createMCPServer } from './server.js';

const config = {
  wsPort: 3001,
  keepAliveInterval: 30000,
};

const dependencies = {
  fsManager: new FSManager(),
};

const server = createMCPServer(config, dependencies);

process.on('SIGINT', async () => {
  await server.close().catch(console.error);
});
