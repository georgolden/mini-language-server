import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { WebSocketServerTransport } from './websocket.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { insertCodeCommand, insertCodeTool } from './capabilities/files/insert.js';
import { getFileContentCommand, getFileContentTool } from './capabilities/files/content.js';
import { getProjectFilesCommand, getProjectFilesTool } from './capabilities/files/files.js';
import { getAvailableSymbolsCommand, getAvailableSymbolsTool } from './capabilities/ast/astCommand.js';
import { lintCommand, lintTool } from './capabilities/linter/lint.js';
import type { IFSManager } from './interfaces/FSManager.js';

export interface MCPServerConfig {
  wsPort: number;
  keepAliveInterval: number;
}

export interface MCPServerDependencies {
  fsManager: IFSManager;
}

export const createMCPServer = (config: MCPServerConfig, deps: MCPServerDependencies) => {
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

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      getProjectFilesTool,
      getAvailableSymbolsTool,
      getFileContentTool,
      insertCodeTool,
      lintTool,
    ],
  }));

  const commands = {
    get_project_files: getProjectFilesCommand.bind(null, deps),
    get_available_symbols: getAvailableSymbolsCommand.bind(null, deps),
    get_file_content: getFileContentCommand.bind(null, deps),
    insert_code: insertCodeCommand.bind(null, deps),
    lint_file: lintCommand.bind(null, deps),
  };

  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    const { name, arguments: args } = request.params;
    const command = commands[name as keyof typeof commands];
    if (!command) throw new Error('unknown command');
    const result = await command(args, {
      server,
    });
    console.log(result);
    return { result };
  });

  const transport = new WebSocketServerTransport(config.wsPort);
  server.connect(transport);

  return server;
}