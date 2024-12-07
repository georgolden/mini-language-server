import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { CallToolResultSchema, ListToolsResultSchema } from '@modelcontextprotocol/sdk/dist/types';
import { Tool } from '../../agents/llms/agent.mjs';

const transport = new StdioClientTransport({
  command: 'dist/mcp/servers/ast.mjs',
  args: ["./"],
});

const client = new Client(
  {
    name: 'ast-client',
    version: '1.0.0',
  },
  {
    capabilities: {},
  },
);

const getTools = async (): Promise<Tool[]> => {
  return (await client.request(
    {
      method: 'tools/list',
      params: {},
    },
    ListToolsResultSchema,
  )).tools.map(tool => ({
    ...tool,
    call: (args) => client.request({
      method: 'tools/call',
      params: {
        name: tool.name,
        arguments: args,
        _meta: {
          progressToken: 0,
        },
      },
    }, CallToolResultSchema)
  }))
}

client.connect(transport).then(async () => {
  console.log(JSON.stringify(await getTools()))
});
