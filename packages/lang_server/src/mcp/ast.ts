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
import { summarizeFilesCommand, summarizeFilesTool } from './capabilities/files/summary.js';
import { lintCommand, lintTool } from './capabilities/linter/lint.js';

const server = new Server(
  {
    name: 'ast-parser',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      getProjectFilesTool,
      getAvailableSymbolsTool,
      getFileContentTool,
      //summarizeFilesTool,
      insertCodeTool,
      lintTool,
    ],
  };
});

const commands: Record<string, (args: any, options: { server: any; logger: any }) => Promise<any>> =
  {
    get_project_files: getProjectFilesCommand,
    get_available_symbols: getAvailableSymbolsCommand,
    get_file_content: getFileContentCommand,
    //summarize_files_content: summarizeFilesCommand,
    insert_code: insertCodeCommand,
    lint_file: lintCommand,
  };

//@ts-ignore
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const command = commands[name];

  if (!command) throw new Error('unknown command');

  const result = await command(args, { server });

  console.log(result);

  return result;
});

const transport = new WebSocketServerTransport(3001);
server.connect(transport);
