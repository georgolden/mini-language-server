#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { Logger } from "../logger/SocketLogger.js";
import { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'

const args = process.argv.slice(1);

const GetProjectFiles = z.object({ test: z.string() })

if (args.length === 0 || !args[1]) {
  console.error("Usage: mcp-ast <repo-folder>");
  process.exit(1);
}

const logger = new Logger();

logger.debug('test')

const server = new Server({
  name: "ast-parser",
  version: "1.0.0",
}, {
  capabilities: {
    tools: {},
    resources: {},
  }
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_project_files",
        description:
          "Retrieve a comprehensive list of all files available within the project. " +
          "This tool allows to list all the files that exist and their paths, making it " +
          "easier to determine which files can be accessed or modified. The listing " +
          "includes file paths and their organization within the project's structure. " +
          "Perfect for exploring the project’s contents efficiently.",
        inputSchema: zodToJsonSchema(GetProjectFiles),
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {

  const { name, arguments: args } = request.params;

  switch (name) {
    case 'get_project_files':
      logger.info(args)
      return {
        contents: [
          // TODO: add implementation to list project files
          'TODO: list dir',
        ],
      };
  }
});

const transport = new StdioServerTransport();
server.connect(transport).catch(console.error);
