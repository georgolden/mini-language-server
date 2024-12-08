#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { Logger } from '../../logger/SocketLogger.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

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
          'Retrieve a list of all files available within the project by provided path. ' +
          'Path should be a valid string that leads to a project where user wants ' +
          'to get files from. It will provide information about all the files except ' +
          'those listed inside of .gitignore. ',
        inputSchema: zodToJsonSchema(GetProjectFiles),
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'get_project_files':
      logger.info(args);
      return {
        content: [
          // TODO: add implementation to list project files
          {
            type: 'text',
            text: 'TODO: list dir',
          },
        ],
      };
  }
});

const transport = new StdioServerTransport();
server.connect(transport).catch(console.error);
