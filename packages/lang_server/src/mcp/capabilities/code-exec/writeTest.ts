import { spawn } from 'node:child_process';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const WriteTestSchema = z.object({
  code: z.string().describe('Code to write tests for'),
});

export const writeTestTool = {
  name: 'write_test',
  description:
    'Automatically generates and executes test cases by analyzing provided code. ' +
    'Detects project setup, generates appropriate test configuration, and stores ' +
    'results in specified location. Supports JavaScript/TypeScript with detailed ' +
    'error reporting.',
  inputSchema: zodToJsonSchema(WriteTestSchema),
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
