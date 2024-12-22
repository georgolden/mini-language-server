import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { WebSocketClientTransport } from '@modelcontextprotocol/sdk/client/websocket.js';
import {
  CallToolResultSchema,
  ListToolsResultSchema,
  CreateMessageRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { Tool, Agent } from '../llms/agent.js';

export const registerSamplings = (agent: Agent) => {
  //@ts-ignore
  client.setRequestHandler(CreateMessageRequestSchema, async ({ method, params }) => {
    if (method === 'sampling/createMessage') {
      console.log(params.messages[0]?.content.text);
      const response = await agent.sendMessage(params.messages[0]?.content.text as string, false);

      console.log('SAMPLING: ', response);

      return {
        content: {
          type: 'text',
          text: response,
        },
        role: 'assistant',
        model: 'claude',
      };
    }
  });
};

const getTools = async (client): Promise<Tool[]> => {
  return (
    await client.request(
      {
        method: 'tools/list',
        params: {},
      },
      ListToolsResultSchema,
    )
  ).tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: {
      type: 'object',
      properties: (tool.inputSchema as any).properties || {},
      additionalProperties: false,
      required: (tool.inputSchema as any).required || [],
    },
    call: async (args) => {
      const result = await client.request(
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
      return result;
    },
  }));
};

export const initializeMCPClient = async () => {
  const transport = new WebSocketClientTransport(new URL('ws://localhost:3001/ws'));
  const client = new Client(
    {
      name: 'ast-client',
      version: '1.0.0',
    },
    {
      capabilities: {
        sampling: {},
      },
    },
  );

  await client.connect(transport);
  //registerSamplings(agent);
  return {
    client,
    getTools: async () => await getTools(client),
  };
};