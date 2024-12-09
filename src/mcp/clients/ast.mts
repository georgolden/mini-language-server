import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { CallToolResultSchema, ListToolsResultSchema } from '@modelcontextprotocol/sdk/dist/types';
import type { Tool } from '../../agents/llms/agent.mjs';

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
      console.log('\n\n\n\nCALL RESULT: ', result);
      return result;
    },
  }));
};

client.connect(transport).then(async () => {
  console.log(JSON.stringify(await getTools()));
});
