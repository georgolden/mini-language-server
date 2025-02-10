import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { WebSocketClientTransport } from '@modelcontextprotocol/sdk/client/websocket.js';
import {
  CallToolResultSchema,
  ListToolsResultSchema,
  CreateMessageRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { BaseLLMChain } from '../llms/base.agent.js';
import type { Tool, Message } from '../llms/types.js';
import { Record } from '@prisma/client/runtime/library';

export const registerSamplings = (agent: BaseLLMChain, client: Client) => {
  // TODO: we may want to rewrite it to be able to support multi
  client.setRequestHandler(
    CreateMessageRequestSchema,
    async ({ method, params }) => {
      if (method === 'sampling/createMessage') {
        const response = await agent.sendMessage({
          type: 'text',
          text: (params.messages[0].content.text as string) ?? '',
        });
        return {
          content: {
            type: 'text',
            text: response,
          },
          role: 'assistant',
          model: 'claude',
          _meta: {},
        };
      }
      throw new Error('Unsupported method');
    },
  );
};

export const getTools = async (client: Client): Promise<Tool[]> => {
  const { tools } = await client.request(
    {
      method: 'tools/list',
      params: {},
    },
    ListToolsResultSchema,
  );

  return tools.map((tool) => {
    const inputSchema = tool.inputSchema as Record<string, unknown>;
    return {
      name: tool.name,
      description: tool.description,
      inputSchema: {
        type: 'object',
        properties: inputSchema?.properties || {},
        additionalProperties: false,
        required: inputSchema?.required || [],
      },
      call: async (args) => {
        const response = await client.request(
          {
            method: 'tools/call',
            params: {
              name: tool.name,
              arguments: args,
              _meta: {
                progressToken: 0,
              },
            },
          },
          CallToolResultSchema,
        );
        const content: Message['content'] = response.content.map((el) => ({
          content: el.text as string,
          type: 'tool_result',
        }));

        return { content, role: 'user', timestamp: new Date() };
      },
    };
  });
};

export const initializeMCPClient = async () => {
  const wsUrl = new URL('ws://localhost:3001');
  const transport = new WebSocketClientTransport(wsUrl);

  const client = new Client(
    {
      name: 'mcp-client',
      version: '1.0.0',
    },
    {
      capabilities: {
        sampling: {},
      },
    },
  );

  try {
    await client.connect(transport);
    return client;
  } catch (error) {
    console.error('Failed to connect to MCP server:', error);
    throw error;
  }
};
