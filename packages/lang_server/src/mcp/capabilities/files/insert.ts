import { readFile, writeFile } from 'node:fs/promises';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';

function getLineIndentation(line: string): number {
  const match = line.match(/^(\s*)/);
  return match ? match[0].length : 0;
}

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

type InsertCodeInput = z.infer<typeof InsertCodeSchema>;

type InsertCodeOutput = {
  success: boolean;
  modifiedFile: string;
  error?: string;
};

export const insertCodeTool = {
  name: 'insert_code',
  description:
    'Inserts or appends code snippets into a specified file at a given position. ' +
    'Supports intelligent code insertion with proper indentation and formatting. ' +
    'Handles multiple programming languages and maintains code structure. ' +
    'Includes validation to prevent syntax errors from incorrect insertions.',
  inputSchema: zodToJsonSchema(InsertCodeSchema),
};

export const insertCodeCommand = async (input: InsertCodeInput): Promise<InsertCodeOutput> => {
  try {
    const fileContent = await readFile(input.filePath, 'utf-8');
    let lines = fileContent.split('\n');

    if (
      input.position.startRow === input.position.endRow &&
      input.position.startColumn === input.position.endColumn
    ) {
      const line = lines[input.position.startRow];
      if (!line) throw new Error('Line is outside file');
      const baseIndent = getLineIndentation(line);

      const codeLines = input.code.split('\n').map((line, index) => {
        return index === 0 ? line : ' '.repeat(baseIndent) + line;
      });

      const targetLine = lines[input.position.startRow];
      lines[input.position.startRow] =
        targetLine?.slice(0, input.position.startColumn) +
        codeLines.join('\n') +
        targetLine?.slice(input.position.startColumn);
    } else if (input.replace) {
      const beforeContent = lines.slice(0, input.position.startRow);
      const afterContent = lines.slice(input.position.endRow + 1);

      const startLineContent = lines[input.position.startRow]?.slice(0, input.position.startColumn);
      const endLineContent = lines[input.position.endRow]?.slice(input.position.endColumn);

      const line = lines[input.position.startRow];
      if (!line) throw new Error('Line is not within file');
      const baseIndent = getLineIndentation(line);

      const newCode = input.code.split('\n').map((line, index) => {
        if (index === 0) return startLineContent + line;
        return ' '.repeat(baseIndent) + line;
      });

      newCode[newCode.length - 1] += endLineContent ?? '';

      lines = [...beforeContent, ...newCode, ...afterContent];
    }

    const modifiedContent = lines.join('\n');
    await writeFile(input.filePath, modifiedContent);

    return {
      success: true,
      modifiedFile: modifiedContent,
    };
  } catch (error) {
    return {
      success: false,
      modifiedFile: '',
      error: error.message,
    };
  }
};

insertCodeCommand({
  code: 'const booba = 1;',
  filePath: 'test-dir/utils.ts',
  position: {
    startRow: 0,
    startColumn: 0,
    endRow: 0,
    endColumn: 100,
  },
  replace: true,
});
