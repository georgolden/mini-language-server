// prob need lang server capabilities
// we can for now try the command with samplings
//  -> get lint command from package.json
//  -> ask llm to modify command for single file
//  -> exec and output result

import { IFSManager } from '../../interfaces/FSManager.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const GetLintCommandRequest = z.object({
  path: z.string().optional().describe('Optional path to the subdir'),
});

const CodeLintSchema = z.object({
  file: z.string().describe('Full path to file we want to lint.'),
});

export const lintTool = {
  name: 'lint_file',
  description:
    'Analyzes code quality and identifies potential errors, style violations, ' +
    'and bugs in the specified file. Provides detailed feedback on code ' +
    'improvements and enforces coding standards. Results include syntax errors, ' +
    'potential runtime issues, and style guide violations.',
  inputSchema: zodToJsonSchema(CodeLintSchema),
};

export const lintCommand = async (
  { fsManager }: { fsManager: IFSManager },
  args: unknown,
  { server }: { server: { request: (params: any, schema: any) => Promise<any> } }
) => {
  // for now js/ts only

  const allFIles = await fsManager.getAllFiles('./');
  // prob wont work for multiple package.jsons lul
  const packagejson = allFIles.find((el) => el.includes('package.json'));

  const command = await server.request(
    {
      method: 'sampling/createMessage',
      params: {
        maxTokens: 350,
        messages: [
          {
            content: {
              type: 'text',
              text:
                'Get lint/format command for the project based on the file structure:' +
                `\n \n <content> \n ${allFIles.join('\n')} \n </content>\n \n ` +
                (packagejson
                  ? 'And the content of package.json: ' + `\n \n <content> \n ${1} \n </content>`
                  : ''),
            },
            role: 'user',
          },
        ],
      },
    },
    GetLintCommandRequest,
  );

  console.log(command);
};