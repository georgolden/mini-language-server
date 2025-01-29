import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { WebSocketClientTransport } from '@modelcontextprotocol/sdk/client/websocket.js';
import {
  CallToolResultSchema,
  ListToolsResultSchema,
  CreateMessageRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { Tool, BaseLLMChain } from '../llms/base.agent.js';

export const registerSamplings = (agent: BaseLLMChain, client: Client) => {
  // TODO: we may want to rewrite it to be able to support multi  
  client.setRequestHandler(CreateMessageRequestSchema, async ({ method, params }) => {
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
  });
};

export const getTools = async (client: Client): Promise<Tool[]> => {
  const { tools } = await client.request(
    {
      method: 'tools/list',
      params: {},
    },
    ListToolsResultSchema,
  );

  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: {
      type: 'object',
      properties: (tool.inputSchema as any).properties || {},
      additionalProperties: false,
      required: (tool.inputSchema as any).required || [],
    },
    call: async (args) => {
      return client.request(
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
    },
  }));
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
