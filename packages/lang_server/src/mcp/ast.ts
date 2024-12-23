import http from 'node:http';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { WebSocketServerTransport } from './websocket.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { Logger } from '../logger/SocketLogger.js';
import { insertCodeCommand, insertCodeTool } from './capabilities/files/insert.js';
import { getFileContentCommand, getFileContentTool } from './capabilities/files/content.js';
import { getProjectFilesCommand } from './capabilities/files/files.js';
import { getAvailableSymbolsTool } from './capabilities/ast/astCommand.js';
import { summarizeFilesCommand, summarizeFilesTool } from './capabilities/files/summary.js';
import { lintCommand, lintTool } from './capabilities/linter/lint.js';

//const CodeRunFileSchema = z.any();
//const CodeRunSnippetSchema = z.any();
//const GetTreeSchema = z.any();

//const args = process.argv.slice(1);
//
//if (args.length === 0 || !args[1]) {
//  console.error('Usage: mcp-ast <repo-folder>');
//  process.exit(1);
//}

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
      //{
      //  name: 'run_file',
      //  description:
      //    'Executes the specified file in a secure environment and returns the complete ' +
      //    'program output. Captures stdout, stderr streams, execution time metrics, and ' +
      //    'runtime statistics. Supports various file types and configurable runtime ' +
      //    'parameters for different execution environments.',
      //  inputSchema: zodToJsonSchema(CodeRunFileSchema),
      //},
      //{
      //  name: 'run_code',
      //  description:
      //    'Executes provided code snippets in an isolated sandbox environment with ' +
      //    'configurable runtime parameters. Returns execution results, output streams, ' +
      //    'and performance metrics. Supports multiple programming languages and provides ' +
      //    'detailed error reporting for failed executions.',
      //  inputSchema: zodToJsonSchema(CodeRunSnippetSchema),
      //},
      //{
      //  name: 'get_simple_tree',
      //  description:
      //    'Generates a hierarchical representation of all named symbols (functions, ' +
      //    'classes, variables) in the project. Displays relationships, scope levels, ' +
      //    'and symbol types in a tree structure. Essential for code navigation and ' +
      //    'understanding project architecture.',
      //  inputSchema: zodToJsonSchema(GetTreeSchema),
      //},
      getAvailableSymbolsTool,
      getFileContentTool,
      summarizeFilesTool,
      insertCodeTool,
      lintTool,
    ],
  };
});

const commands: Record<string, (args: any, options: { server: any; logger: any }) => Promise<any>> =
  {
    get_project_files: getProjectFilesCommand,
    get_file_content: getFileContentCommand,
    summarize_files_content: summarizeFilesCommand,
    insert_code: insertCodeCommand,
    lint_file: lintCommand,
  };

//@ts-ignore
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const command = commands[name];

  if (!command) throw new Error('unknown command');

  return await command(args, { server, logger });

  switch (name) {
    case 'lint_file': {
      return {};
    }
    case 'run_file': {
      // idk what is the usecase for this
      return {};
    }
    case 'run_project': {
      // approach i think of:
      //  llm should get some knowledge about the project
      //  how to run it and what the expected output is
      //  for example if it is a server it should be able
      //  to test it via curl or similar way
      //  for frotends it will be trickier
      //  but we can write some headless browser integration
      //  like puppeteer and see how it works
      //
      //  -> we can start by parsing the command
      //  -> getting output from the summarize_files_content
      //  -> get understanding of the project and how to test it
      //  -> add additional tools like 'curl' and 'puppeteer'
      //  -> map output to llm (for frontends will be super hard)
      //  -> we can use mcp example for puppeteer as base idk
      return {};
    }
    case 'run_code': {
      // basic command to run snippet of code and get output
      // llm is required to provide all necessary arguments
      //  -> accept code and args
      //  -> execute and return result/logs
      return {};
    }
    case 'get_simple_tree': {
      // tbh idk where to use this command
      return {};
    }
    case 'get_available_symbols': {
      // will be used before llm is trying to adjust any code
      // it will provide context of what can be used in the project
      // can be super bloated so samplings should be integrated
      return {};
    }
  }
});

//const transport = new SSEServerTransport("/message", {
//
//});

//const app = http.createServer();
//const logger = new Logger();
const transport = new WebSocketServerTransport(
  3001,

  //logger
);
server.connect(transport);

//const PORT = process.env.PORT || 3001;
//app.listen(PORT, () => {
//  console.log(`Server-chan is running on port ${PORT} nya~`);
//});

//app.on('error', console.log);
//app.on('connect', console.log);
//app.on('request', console.log);
//app.on('connection', console.log);
