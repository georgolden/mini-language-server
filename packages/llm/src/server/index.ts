import { applyWSSHandler } from '@trpc/server/adapters/ws';
import { WebSocketServer } from 'ws';
import { t } from './trpc.js';
import { z } from 'zod';
import { prisma } from './db.js';
import { type ClaudeEnhancedAgent, createClaudeClient } from '../llms/claude.js';
import { createASTAgent } from '../astAgent/ast.js';
import { getTools, initializeMCPClient } from '../mcp/ast.js';
import dotenv from 'dotenv';
import { createContext } from './context.js';
import { isAuthed } from './middleware/auth.js';

dotenv.config();

// Initialize tRPC
const agents = new Map<number, ClaudeEnhancedAgent>();

const protectedProcedure = t.procedure.use(isAuthed);
// Define router using imported utilities
const appRouter = t.router({
  createChat: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        type: z.string(),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const chat = await prisma.chat.create({
        data: {
          title: input.title,
          type: input.type,
          metadata: JSON.stringify({ description: input.description }),
        },
      });
      return chat;
    }),

  getChats: protectedProcedure.query(async () => {
    return prisma.chat.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }),

  wsConnect: protectedProcedure.input(z.object({ chatId: z.number() }))
  .subscription(async function*({ input: { chatId } }) {
    const messages = await prisma.message.findMany({
      where: { chatId },
      orderBy: { timestamp: 'asc' },
    });

    // Handle MCP connection
    const claudeClient = createClaudeClient(process.env['ANTHROPIC_API']!);
    const mcpClient = await initializeMCPClient();
    const agent = await createASTAgent(claudeClient, await getTools(mcpClient), mcpClient);
    agents.set(chatId, agent);

    const res = {
      messages,
      agent,
      mcpClient,
    };
    yield res;
  }),

  sendMessage: t.procedure
    .input(
      z.object({
        chatId: z.number(),
        content: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const { chatId, content } = input;
      const agent = agents.get(chatId);

      if (!agent) {
        throw new Error('No active agent');
      }

      // Save user message
      await prisma.message.create({
        data: {
          chatId,
          content,
          role: 'user',
        },
      });

      // Send to agent and get response
      await agent.sendMessage(content);
      const agentMessages = agent.getMessages();
      const lastMessage = agentMessages[agentMessages.length - 1];

      if (lastMessage) {
        // Save assistant message
        await prisma.message.create({
          data: {
            chatId,
            content: lastMessage.content,
            role: 'assistant',
          },
        });
      }

      return {
        messages: agentMessages,
        timestamp: new Date(),
      };
    }),
});
// Create HTTP server
// Create WebSocket server
const wss = new WebSocketServer({ port: 3002 });

// Add createContext to the handler config
const handler = applyWSSHandler({ 
  wss, 
  router: appRouter,
  createContext 
});

// Start server
wss.on('listening', () => {
  console.log('WebSocket Server listening on ws://localhost:3002');
});

process.on('SIGTERM', () => {
  handler.broadcastReconnectNotification();
  wss.close();
});

// Export type
export type AppRouter = typeof appRouter;
