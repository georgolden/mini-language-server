#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { Logger } from '../../logger/SocketLogger.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { getAllFiles } from './files.mjs';

const args = process.argv.slice(1);

const GetProjectFiles = z.object({
  path: z.string().describe('Required! Path to the project to list files from'),
});

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
    ],
  };
});

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
      return {
        content: [
          {
            type: 'text',
            text: (await getAllFiles(path as string)).join('\n'),
          },
        ],
      };
    }
  }
});

const transport = new StdioServerTransport();
server.connect(transport).catch(console.error);
