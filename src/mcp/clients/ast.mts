import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: 'path/to/server',
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

client.connect(transport);
