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

export const createMCPServer = (config: MCPServerConfig, dependencies: MCPServerDependencies) => {
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
  
  // Command handlers
  const commands: Record<string, (args: any, options: { server: any; logger: any }) => Promise<any>> =
    {
      get_project_files: getProjectFilesCommand.bind(null, dependencies),
      get_available_symbols: getAvailableSymbolsCommand.bind(null, dependencies),
      get_file_content: getFileContentCommand.bind(null, dependencies),
      insert_code: insertCodeCommand.bind(null, dependencies),
      lint_file: lintCommand.bind(null, dependencies),
    };
  
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const command = commands[name];
    if (!command) throw new Error('unknown command');
    const result = await command(args, {
      server,
      logger: console,
    });
    return result;
  });

  const transport = new WebSocketServerTransport(config.wsPort);
  server.connect(transport);

  return server;
}
