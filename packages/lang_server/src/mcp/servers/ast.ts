#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { Logger } from '../../logger/SocketLogger.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { getAllFiles, getFileContent } from './capabilities/files';
import { z } from 'zod';

const GetProjectFiles = z.object({});
const SummarizeRequest = z.any();
const CodeLintSchema = z.any();
const CodeRunFileSchema = z.any();
const CodeRunSnippetSchema = z.any();
const GetTreeSchema = z.any();
const GetAvailableSymbolsSchema = z.any();

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
        name: 'get_project_files',
        description:
          'retrieve a list of all files available within the project by provided path. ' +
          'path should be a valid string that leads to a project where user wants ' +
          'to get files from. it will provide information about all the files except ' +
          'those listed inside of .gitignore. ',
        inputSchema: zodToJsonSchema(GetProjectFiles),
      },
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
        description: 'Run linter on the speicifc file. Can be used to validate the code',
        inputSchema: zodToJsonSchema(CodeLintSchema),
      },
      {
        name: 'run_file',
        description: 'Execute specific file and returns the output',
        inputSchema: zodToJsonSchema(CodeRunFileSchema),
      },
      {
        name: 'run_code',
        description: 'Execute specific code snippet and returns the output',
        inputSchema: zodToJsonSchema(CodeRunSnippetSchema),
      },
      {
        name: 'get_simple_tree',
        description: 'Returns tree of all named symbols in the project',
        inputSchema: zodToJsonSchema(GetTreeSchema),
      },
      {
        name: 'get_symbols_for_scope',
        description:
          'Get all available named symbols that can be used in scope ' +
          'at specific position or for specific symbol',
        inputSchema: zodToJsonSchema(GetAvailableSymbolsSchema),
      },
    ],
  };
});
//@ts-ignore
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'get_project_files': {
      const { path } = args ?? { path: '' };
      return {
        content: [
          {
            type: 'text',
            text: (await getAllFiles(path as string)).join('\n'),
          },
        ],
      };
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
  }
});

const transport = new StdioServerTransport();
server.connect(transport).catch(console.error);
