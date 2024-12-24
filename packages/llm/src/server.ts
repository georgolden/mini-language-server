import fastify from 'fastify';
import websocketPlugin from '@fastify/websocket';
import { createClaudeClient } from './llms/claude.js';
import { createASTAgent } from './astAgent/ast.js';
import dotenv from 'dotenv';
import { getTools, initializeMCPClient } from './mcp/ast.js';

dotenv.config();

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
    console.log('ws con');

    const claudeClient = createClaudeClient(process.env.ANTHROPIC_API);
    console.log('ENV: ', process.env);
    const mcpClient = await initializeMCPClient();
    const astAgent = await createASTAgent(claudeClient, await getTools(mcpClient), mcpClient);
    connection.on('open', console.log);
    connection.on('message', async (message: string) => {
      console.log(`WebSocket message received: ${typeof message}`);
      const request = JSON.parse(message);
      const responseMessage = await astAgent.sendMessage(request.message);
      console.log(`LLM: ${responseMessage}`);
      const response: IResponse = {
        role: 'Mochi-tan',
        content: responseMessage,
        timestamp: Date.now(),
      };
      connection.send(JSON.stringify(response));

      connection.on('close', () => {});
    });
  });
});

start();
