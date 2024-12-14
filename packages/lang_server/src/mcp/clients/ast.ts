import { Client } from '@modelcontextprotocol/sdk/client/index';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio';
import {
  CallToolResultSchema,
  ListToolsResultSchema,
  CreateMessageRequestSchema,
} from '@modelcontextprotocol/sdk/dist/types';
import type { Tool } from '../../agents/llms/agent';
import type { Agent } from '../../agents/llms/agent';

const transport = new StdioClientTransport({
  command: 'dist/mcp/servers/ast.mjs',
  args: ['./'],
});

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

export const getTools = async (): Promise<Tool[]> => {
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

client.connect(transport).then(async () => {
  //console.log(JSON.stringify(await getTools()));
});
