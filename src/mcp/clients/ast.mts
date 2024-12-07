import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { ListToolsResultSchema } from '@modelcontextprotocol/sdk/dist/types';

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

const getTools = async () => {
  return await client.request(
    {
      method: 'tools/list',
      params: {},
    },
    ListToolsResultSchema,
  )
}

client.connect(transport).then(async () => {
  console.log(JSON.stringify(await getTools()))
});
