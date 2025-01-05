import fastify from 'fastify';
import websocketPlugin from '@fastify/websocket';
import { type ClaudeEnhancedAgent, createClaudeClient } from './llms/claude.js';
import { createASTAgent } from './astAgent/ast.js';
import dotenv from 'dotenv';
import { getTools, initializeMCPClient } from './mcp/ast.js';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { fastifyJwtJwks } from 'fastify-jwt-jwks';

dotenv.config();

const initDB = async () => {
  const db = await open({
    filename: 'chats.db',
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS chats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      metadata TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id INTEGER,
      content TEXT NOT NULL,
      role TEXT NOT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (chat_id) REFERENCES chats(id)
    );
  `);

  return db;
};

const db = await initDB();

const server = fastify({ logger: true, disableRequestLogging: true });
server.register(websocketPlugin);
server.register(fastifyJwtJwks, {
  jwksUrl: `https://${process.env['AUTH0_DOMAIN']}/.well-known/jwks.json`,
  audience: process.env['AUTH0_AUDIENCE']
});

server.post('/chats',{
  onRequest: [async (request) => {
    await request.jwtVerify()
  }]
}, async (request, reply) => {
  const { title } = request.body as { title: string };
  const result = await db.run('INSERT INTO chats (title) VALUES (?)', title);
  return { id: result.lastID, title };
});
server.get('/chats', {
  onRequest: [async (request) => {
    await request.jwtVerify()
  }]
}, async () => {
  return db.all('SELECT * FROM chats ORDER BY created_at DESC');
});
server.get('/chats/:id/messages', async (request) => {
  const { id } = request.params as { id: string };
  return db.all('SELECT * FROM messages WHERE chat_id = ? ORDER BY timestamp', id);
});

const agents = new Map<number, ClaudeEnhancedAgent>();

server.register(async (fastify) => {
  fastify.get('/ws', { 
    websocket: true,
    handler: function wsHandler(connection, req) {
      let currentChatId: number | null = null;
      
      if (connection && connection.socket) {
        connection.socket.on('message', async (message: string) => {
          const request = JSON.parse(message);

          switch (request.type) {
            case 'select-chat': {
              currentChatId = request.chatId;
              const messages = await db.all(
                'SELECT * FROM messages WHERE chat_id = ? ORDER BY timestamp',
                currentChatId,
              );
              connection.socket.send(
                JSON.stringify({
                  type: 'chat-history',
                  messages,
                }),
              );
              break;
            }

            case 'mcp-connect': {
              console.log('connect');
              const claudeClient = createClaudeClient((process.env as any).ANTHROPIC_API as string);
              const mcpClient = await initializeMCPClient();

              connection.socket.send(
                JSON.stringify({
                  type: 'mcp-connect',
                  connected: true,
                }),
              );

              if (currentChatId) {
                const agent = await createASTAgent(claudeClient, await getTools(mcpClient), mcpClient);
                agents.set(currentChatId, agent);
              }

              mcpClient.onclose = () => {
                connection.socket.send(
                  JSON.stringify({
                    type: 'mcp-connect',
                    connected: false,
                  }),
                );
              };
              break;
            }

            case 'message': {
              if (!currentChatId || !agents.get(currentChatId)) {
                console.error('No active chat or agent');
                return;
              }

              const currentAgent = agents.get(currentChatId)!;
              await currentAgent.sendMessage(request.message);

              // Save message to DB
              await db.run(
                'INSERT INTO messages (chat_id, content, role) VALUES (?, ?, ?)',
                currentChatId,
                request.message,
                'user',
              );

              const agentMessages = currentAgent.getMessages();
              const lastMessage = agentMessages[agentMessages.length - 1];

              if (lastMessage) {
                await db.run(
                  'INSERT INTO messages (chat_id, content, role) VALUES (?, ?, ?)',
                  currentChatId,
                  lastMessage.content,
                  'assistant',
                );
              }

              connection.socket.send(
                JSON.stringify({
                  type: 'message',
                  messages: agentMessages,
                  timestamp: Date.now(),
                }),
              );
              break;
            }
          }
        });

        connection.socket.on('close', () => {
          if (currentChatId) {
            agents.delete(currentChatId);
          }
        });
      }
    }
  });
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

start();
