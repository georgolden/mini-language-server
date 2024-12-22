import fastify from 'fastify';
import websocketPlugin from '@fastify/websocket';
import { createClaudeClient } from './llms/claude.js';
import { createASTAgent } from './astAgent/ast.js';
import 'dotenv/config';
import { initializeMCPClient } from './mcp/ast.js';

const server = fastify({ logger: true, disableRequestLogging: true });
server.register(websocketPlugin);

interface IMessage {
  message: string;
}

interface IResponse {
  status: string;
  timestamp: number;
}

// Routes
server.get('/', async (request, reply) => {
  return { message: 'Konnichiwa, World! ^_^' };
});

server.post('/message', async (request, reply) => {
  request.body;
  return { message: 'Konnichiwa, World! ^_^' };
});

server.get('/neko', async (request, reply) => {
  return { message: 'Nya~' };
});

// Start server
const start = async () => {
  try {
    await server.listen({ port: 3002 });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

server.register(async (fastify) => {
  fastify.get('/ws', { websocket: true }, async (connection, req) => {
    const claudeClient = createClaudeClient(process.env.ANTHROPIC_API);

    const mcpClient = await initializeMCPClient();
    const astAgent = createASTAgent(claudeClient, await mcpClient.getTools());
    connection.on('message', async (message: string) => {
      fastify.log.info(`WebSocket message received: ${message}`);
      console.log('TOOLS: ', await mcpClient.getTools());
      const interval = setInterval(() => {
        const response: IResponse = {
          status: 'Nyandom message from server~!',
          timestamp: Date.now(),
        };
        connection.send(JSON.stringify(response));
      }, 5000);

      connection.on('close', () => {
        clearInterval(interval);
      });
    });
  });
});

start();
