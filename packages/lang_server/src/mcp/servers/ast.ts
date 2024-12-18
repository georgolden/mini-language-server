#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { Logger } from '../../logger/SocketLogger.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { getAllFiles, getFileContent } from './capabilities/files/index.js';
import { z } from 'zod';
import { readFile, writeFile } from 'node:fs/promises';

const GetProjectFiles = z.object({
  path: z.string().describe('Required! Path to the project directory to list files from'),
});
const GetFileContent = z.object({
  path: z.string().optional().describe('Optional path to the subdir'),
  file: z.string().describe('Path to the file to get content from')
});
const SummarizeRequest = z.object({
  path: z.string().optional().describe('Optional path to the subdir'),
});
const CodeLintSchema = z.any();
const CodeRunFileSchema = z.any();
const CodeRunSnippetSchema = z.any();
const GetTreeSchema = z.any();
const GetAvailableSymbolsSchema = z.object(
  {
    row: z.string().describe('Line number'),
    column: z.string().describe(''),
  }
).or(z.object({

}));
const InsertCodeSchema = z.object({
  replace: z.boolean().optional().describe('Position to replace the code'),
  code: z.string().describe('Code to insert'),
  filePath: z.string().describe('Path to the file'),
  position: z
    .object({
      startRow: z.number().describe('Start line'),
      startColumn: z.number().describe('Start character'),
      endRow: z.number().describe('End line'),
      endColumn: z.number().describe('End character'),
    })
    .describe(
      'Position to insert at, if start and end line/character ' +
      'are equal we just insert code instead of replacing',
    ),
});

type InsertCodeOutput = {
  success: boolean;
  modifiedFile: string;
  error?: string;
};

type InsertCodeInput = z.infer<typeof InsertCodeSchema>;

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
        name: 'get_file_content',
        description: '',
        inputSchema: zodToJsonSchema(GetFileContent),
      }
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
      {
        name: 'insert_code',
        description:
          'Inserts or appends code snippets into a specified file at a given position. ' +
          'Supports intelligent code insertion with proper indentation and formatting. ' +
          'Handles multiple programming languages and maintains code structure. ' +
          'Includes validation to prevent syntax errors from incorrect insertions.',
        inputSchema: zodToJsonSchema(InsertCodeSchema),
      },
    ],
  };
});

function getLineIndentation(line: string): number {
  const match = line.match(/^(\s*)/);
  return match ? match[0].length : 0;
}

async function insertCode(input: InsertCodeInput): Promise<InsertCodeOutput> {
  try {
    const fileContent = await readFile(input.filePath, 'utf-8');
    let lines = fileContent.split('\n');

    // If start and end positions are same - just insert
    if (input.position.startRow === input.position.endRow &&
      input.position.startColumn === input.position.endColumn) {

      // Get indentation of target line
      const line = lines[input.position.startRow];
      if (!line) throw new Error('Line is outside file')
      const baseIndent = getLineIndentation(line);

      // Prepare code with proper indentation
      const codeLines = input.code.split('\n').map((line, index) => {
        return index === 0 ? line : ' '.repeat(baseIndent) + line;
      });

      // Insert code
      const targetLine = lines[input.position.startRow];
      lines[input.position.startRow] =
        targetLine?.slice(0, input.position.startColumn) +
        codeLines.join('\n') +
        targetLine?.slice(input.position.startColumn);

    } else if (input.replace) {
      // Handle multi-line replace

      // Get content before the replacement
      const beforeContent = lines.slice(0, input.position.startRow);
      const afterContent = lines.slice(input.position.endRow + 1);

      // Get the partial content of start and end lines if needed
      const startLineContent = lines[input.position.startRow]?.slice(0, input.position.startColumn);
      const endLineContent = lines[input.position.endRow]?.slice(input.position.endColumn);

      // Get indentation of target position
      const line = lines[input.position.startRow]
      if (!line) throw new Error('Line is not within file')
      const baseIndent = getLineIndentation(line);

      // Prepare new code with proper indentation
      const newCode = input.code.split('\n').map((line, index) => {
        // First line uses start line indentation
        if (index === 0) return startLineContent + line;
        return ' '.repeat(baseIndent) + line;
      });

      // Add the end line content to last line of new code
      newCode[newCode.length - 1] += endLineContent ?? '';

      // Combine everything
      lines = [...beforeContent, ...newCode, ...afterContent];
    }

    const modifiedContent = lines.join('\n');
    await writeFile(input.filePath, modifiedContent);

    return {
      success: true,
      modifiedFile: modifiedContent
    };

  } catch (error) {
    return {
      success: false,
      modifiedFile: '',
      error: error.message
    };
  }
}

//@ts-ignore
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'get_project_files': {
      const { path } = args;

      if (!path) {
        throw new Error('No path for get_project_files command!');
      }

      return {
        content: [
          {
            type: 'text',
            text: (await getAllFiles(path as string)).join('\n'),
          },
        ],
      };
    }
    case 'get_file_content': {
      const { file, path } = args;

      if (!path) {
        throw new Error('No path for get_project_files command!');
      }

      return {
        content: [
          {
            type: 'text',
            text: await getFileContent(file, path),
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


      return {}
    }
  }
});

const transport = new StdioServerTransport();
server.connect(transport).catch(console.error);
