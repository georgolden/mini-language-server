#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { Logger } from '../../logger/SocketLogger.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { getAllFiles, getFileContent } from './capabilities/files/index.js';
import { z } from 'zod';
import { insertCodeTool } from './capabilities/files/insert.js';
import { getFileContentCommand } from './capabilities/files/content.js';
import { getProjectFilesCommand } from './capabilities/files/files.js';

const SummarizeRequest = z.object({
  path: z.string().optional().describe('Optional path to the subdir'),
});
const CodeLintSchema = z.any();
const CodeRunFileSchema = z.any();
const CodeRunSnippetSchema = z.any();
const GetTreeSchema = z.any();
const GetAvailableSymbolsSchema = z
  .object({
    row: z.string().describe('Line number'),
    column: z.string().describe(''),
  })
  .or(z.object({}));

const args = process.argv.slice(1);

if (args.length === 0 || !args[1]) {
  console.error('Usage: mcp-ast <repo-folder>');
  process.exit(1);
}

const logger = new Logger();

logger.debug('test');

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
      {
        name: 'summarize_files_content',
        description:
          'Analyze and provide concise summaries of the contents of specified files within the project. ' +
          'This tool reads the content of each file and generates a comprehensive summary of their key points, ' +
          'structure, and main functionality. It helps in quickly understanding the purpose and content of ' +
          'multiple files without having to read them in detail.',
        inputSchema: zodToJsonSchema(GetProjectFiles),
      },
      {
        name: 'lint_file',
        description:
          'Analyzes code quality and identifies potential errors, style violations, ' +
          'and bugs in the specified file. Provides detailed feedback on code ' +
          'improvements and enforces coding standards. Results include syntax errors, ' +
          'potential runtime issues, and style guide violations.',
        inputSchema: zodToJsonSchema(CodeLintSchema),
      },
      {
        name: 'run_file',
        description:
          'Executes the specified file in a secure environment and returns the complete ' +
          'program output. Captures stdout, stderr streams, execution time metrics, and ' +
          'runtime statistics. Supports various file types and configurable runtime ' +
          'parameters for different execution environments.',
        inputSchema: zodToJsonSchema(CodeRunFileSchema),
      },
      {
        name: 'run_code',
        description:
          'Executes provided code snippets in an isolated sandbox environment with ' +
          'configurable runtime parameters. Returns execution results, output streams, ' +
          'and performance metrics. Supports multiple programming languages and provides ' +
          'detailed error reporting for failed executions.',
        inputSchema: zodToJsonSchema(CodeRunSnippetSchema),
      },
      {
        name: 'get_simple_tree',
        description:
          'Generates a hierarchical representation of all named symbols (functions, ' +
          'classes, variables) in the project. Displays relationships, scope levels, ' +
          'and symbol types in a tree structure. Essential for code navigation and ' +
          'understanding project architecture.',
        inputSchema: zodToJsonSchema(GetTreeSchema),
      },
      {
        name: 'get_available_symbols',
        description:
          'Retrieves all accessible named symbols (variables, functions, classes) that ' +
          'are in scope for a specific symbol location. Includes imported modules, ' +
          'global variables, and local definitions. Provides context-aware symbol ' +
          'information for code completion and reference checking features.',
        inputSchema: zodToJsonSchema(GetAvailableSymbolsSchema),
      },
      getFileContentCommand,
      insertCodeTool,
    ],
  };
});

//@ts-ignore
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'get_project_files': {
      return getProjectFilesCommand(args);
    }
    case 'get_file_content': {
      return await getFileContentCommand(args);
    }
    case 'summarize_files_content': {
      const { path } = args ?? { path: '' };

      if (typeof path !== 'string') {
        throw new Error('Argument should be of type string!');
      }

      const files = await getAllFiles(path);

      const cache: Record<string, string> = {};

      for (const file of files) {
        const content = await getFileContent(file, path);

        const summary = await server.request(
          {
            method: 'sampling/createMessage',
            params: {
              maxTokens: 350,
              messages: [
                {
                  content: {
                    type: 'text',
                    text: `Summarize the following file content: \n \n <content> \n ${content} \n </content>`,
                  },
                  role: 'user',
                },
              ],
            },
          },
          SummarizeRequest,
        );

        logger.debug(JSON.stringify(summary));

        cache[file] = summary?.content?.text ?? '';
      }

      return {
        content: [
          {
            type: 'text',
            text: `Summary of all files in project: \n
              ${Object.entries(cache)
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n\n')}`,
          },
        ],
      };
    }
    case 'lint_file': {
      // prob need lang server capabilities
      // we can for now try the command with samplings
      //  -> get lint command from package.json
      //  -> ask llm to modify command for single file
      //  -> exec and output result
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
    case 'insert_code': {
      return {};
    }
  }
});

const transport = new StdioServerTransport();
server.connect(transport).catch(console.error);
