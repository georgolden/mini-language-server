import fastify from 'fastify';
import websocketPlugin from '@fastify/websocket';
import { type ClaudeEnhancedAgent, createClaudeClient } from './llms/claude.js';
import { createASTAgent } from './astAgent/ast.js';
import dotenv from 'dotenv';
import { getTools, initializeMCPClient } from './mcp/ast.js';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { initTRPC } from '@trpc/server';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import { z } from 'zod';

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

type Context = {
  db: Awaited<ReturnType<typeof initDB>>;
  agents: Map<number, ClaudeEnhancedAgent>;
};

const t = initTRPC.context<Context>().create();

const server = fastify({ logger: true, disableRequestLogging: true });
server.register(websocketPlugin);

const appRouter = t.router({
  createChat: t.procedure
    .input(
      z.object({
        title: z.string(),
        type: z.string(),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const metadata = JSON.stringify({ description: input.description });
      const result = await ctx.db.run(
        'INSERT INTO chats (title, type, metadata) VALUES (?)',
        input.title,
        input.type,
        metadata,
      );
      return { id: result.lastID, title: input.title };
    }),
  getChats: t.procedure.query(async ({ ctx }) => {
    return ctx.db.all('SELECT * FROM chats ORDER BY created_at DESC');
  }),
});

export type AppRouter = typeof appRouter;

//server.post('/chats', async (request, reply) => {
//  const { title, type, description } = request.body as any;
//  const metadata = JSON.stringify({ description });
//  const result = await db.run('INSERT INTO chats (title, type) VALUES (?)', title, type, metadata);
//  return { id: result.lastID, title };
//});
//server.get('/chats', async () => {
//  return db.all('SELECT * FROM chats ORDER BY created_at DESC');
//});
//server.get('/chats/:id/messages', async (request) => {
//  const { id } = request.params as { id: string };
//  return db.all('SELECT * FROM messages WHERE chat_id = ? ORDER BY timestamp', id);
//});

const agents = new Map<number, ClaudeEnhancedAgent>();

server.register(async (fastify) => {
  fastify.get('/ws', { websocket: true }, async (connection, req) => {
    let currentChatId: number | null = null;

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
  });
});

server.register(fastifyTRPCPlugin, {
  prefix: '/trpc',
  useWSS: true,
  trpcOptions: {
    router: appRouter,
    createContext: async () => {
      const db = await initDB();
      return {
        db,
        agents: new Map<number, ClaudeEnhancedAgent>(),
      };
    },
  },
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
