import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { WebSocketServerTransport } from './websocket.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { insertCodeCommand, insertCodeTool } from './capabilities/files/insert.js';
import { getFileContentCommand, getFileContentTool } from './capabilities/files/content.js';
import { getProjectFilesCommand, getProjectFilesTool } from './capabilities/files/files.js';
import {
  getAvailableSymbolsCommand,
  getAvailableSymbolsTool,
} from './capabilities/ast/astCommand.js';
import { lintCommand, lintTool } from './capabilities/linter/lint.js';

// Server configuration
const server = new Server(
  {
    name: 'mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  },
);

// Tool registration
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    getProjectFilesTool,
    getAvailableSymbolsTool,
    getFileContentTool,
    insertCodeTool,
    lintTool,
  ],
}));

// Command handlers
const commands: Record<string, (args: any, options: { server: any; logger: any }) => Promise<any>> =
  {
    get_project_files: getProjectFilesCommand,
    get_available_symbols: getAvailableSymbolsCommand,
    get_file_content: getFileContentCommand,
    insert_code: insertCodeCommand,
    lint_file: lintCommand,
  };

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const command = commands[name];
  if (!command) throw new Error('unknown command');
  const result = await command(args, {
    server,
    logger: console,
  });
  console.log(result);
  return result;
});

// WebSocket transport setup
const wsConfig = {
  port: 3001,
  keepAliveInterval: 30000,
};

const transport = new WebSocketServerTransport(wsConfig.port);
server.connect(transport);
