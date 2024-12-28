import fastify from 'fastify';
import websocketPlugin from '@fastify/websocket';
import { type ClaudeEnhancedAgent, createClaudeClient } from './llms/claude.js';
import { createASTAgent } from './astAgent/ast.js';
import dotenv from 'dotenv';
import { getTools, initializeMCPClient } from './mcp/ast.js';

dotenv.config();

const server = fastify({ logger: true, disableRequestLogging: true });
server.register(websocketPlugin);

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

let agent: ClaudeEnhancedAgent | null = null;
server.register(async (fastify) => {
  fastify.get('/ws', { websocket: true }, async (connection, req) => {
    connection.on('open', console.log);
    connection.on('message', async (message: string) => {
      const request = JSON.parse(message);
      if (request.type === 'mcp-connect') {
        console.log('connect');
        const claudeClient = createClaudeClient((process.env as any).ANTHROPIC_API as string);
        const mcpClient = await initializeMCPClient();
        connection.send(
          JSON.stringify({
            type: 'mcp-connect',
            connected: true,
          }),
        );
        agent = await createASTAgent(claudeClient, await getTools(mcpClient), mcpClient);
        console.log('agent');

        mcpClient.onclose = () => {
          connection.send(
            JSON.stringify({
              type: 'mcp-connect',
              connected: false,
            }),
          );
        };
      } else if (request.type === 'message') {
        if (!agent) {
          console.error('Message before connected');
          return;
        }
        await (agent as ClaudeEnhancedAgent).sendMessage(request.message);
        const messages = (agent as ClaudeEnhancedAgent).getMessages();
        const response = {
          messages: messages,
          timestamp: Date.now(),
          type: 'message',
        };
        connection.send(JSON.stringify(response));
      }
      connection.on('close', () => {});
    });
  });
});

start();
