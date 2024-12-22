import fastify from 'fastify';
import websocketPlugin from '@fastify/websocket';
import { createClaudeClient } from './llms/claude.js';
import { createASTAgent } from './astAgent/ast.js';
import 'dotenv/config';

const server = fastify({ logger: true, disableRequestLogging: true });
server.register(websocketPlugin);

const claudeClient = createClaudeClient(process.env.ANTHROPIC_API);
const astAgent = createASTAgent(claudeClient);

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
    await server.listen({ port: 3000 });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

server.register(async (fastify) => {
  fastify.get('/ws', { websocket: true }, (connection, req) => {
    connection.on('message', (message: string) => {
      fastify.log.info(`WebSocket message received: ${message}`);

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
