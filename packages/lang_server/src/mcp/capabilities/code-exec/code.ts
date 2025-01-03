import { spawn } from 'node:child_process';
import { json } from 'node:stream/consumers';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const CodeRunSnippetSchema = z.object({
  code: z.string().describe('Code to execute'),
});

export const runCodeSnippetTool = {
  name: 'run_code_snippet',
  description:
    'Executes provided code snippets in an isolated sandbox environment with ' +
    'configurable runtime parameters. Returns execution results, output streams, ' +
    'and performance metrics. Supports javascript programming language and provides ' +
    'detailed error reporting for failed executions.',
  inputSchema: zodToJsonSchema(CodeRunSnippetSchema),
};

export const runCodeSnippetCommand = async ({ code }: z.infer<typeof CodeRunSnippetSchema>) => {
  const codeResult = new Promise((resolve) => {
    const child = spawn('node', [
      '-e',
      `
      const originalLog = console.log;
      const originalError = console.error;
      let output = [];
      
      console.log = (...args) => {
        output.push(...args);
        originalLog.apply(console, args);
      };
      
      console.error = (...args) => {
        output.push(...args);
        originalError.apply(console, args);
      };

      try {
        const result = eval(${JSON.stringify(code)});
        process.stdout.write('\\n%%%RESULT%%%' + JSON.stringify({
          success: true,
          result,
          consoleOutput: output
        }));
      } catch (error) {
        process.stdout.write('\\n%%%RESULT%%%' + JSON.stringify({
          success: false,
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack
          },
          consoleOutput: output
        }));
      }
    `,
    ]);

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data: string) => {
      stdout += data;
    });
    child.stderr.on('data', (data: string) => {
      stderr += data;
    });

    child.on('close', () => {
      try {
        const [output, resultJson] = stdout.split('\n%%%RESULT%%%');
        const result = JSON.parse(resultJson ?? '');
        result.output = { stdout: output, stderr };
        resolve(result);
      } catch {
        resolve({
          success: false,
          error: {
            name: 'ProcessError',
            message: 'Failed to parse process output',
          },
          output: { stdout, stderr },
        });
      }
    });
  });

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(await codeResult),
      },
    ],
  };
};
