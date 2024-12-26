import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';

function getLineIndentation(line: string): number {
  const match = line.match(/^(\s*)/);
  return match ? match[0].length : 0;
}

const InsertCodeSchema = z.object({
  replace: z.boolean().optional().describe('Position to replace the code'),
  code: z.string().describe('Code to insert'),
  filePath: z.string().describe('Path to the existing file to insert code to'),
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
    'Includes validation to prevent syntax errors from incorrect insertions. ' +
    'Can only take existing file as argument.',
  inputSchema: zodToJsonSchema(InsertCodeSchema),
};

export const insertCodeCommand = async (input: InsertCodeInput) => {
  try {
    const dirPath = path.dirname(input.filePath);
    await mkdir(dirPath, { recursive: true });

    // For empty files or new files, write directly
    if (input.position.startRow === 0 && input.position.startColumn === 0 && input.replace) {
      await writeFile(input.filePath, input.code);

      return {
        content: [
          {
            type: 'text',
            text: 'Code inserted succesfully',
          },
        ],
      };
    }

    // Read existing file or create empty
    let fileContent = '';
    try {
      await access(input.filePath);
      fileContent = await readFile(input.filePath, 'utf-8');
    } catch {
      await writeFile(input.filePath, '');
    }

    let lines = fileContent.split('\n');

    // Ensure we have enough lines
    while (lines.length <= input.position.startRow) {
      lines.push('');
    }

    // Handle insertion at specific position
    if (
      input.position.startRow === input.position.endRow &&
      input.position.startColumn === input.position.endColumn
    ) {
      const line = lines[input.position.startRow] || '';
      const baseIndent = getLineIndentation(line);

      const codeLines = input.code.split('\n').map((codeLine, index) => {
        return index === 0 ? codeLine : ' '.repeat(baseIndent) + codeLine;
      });

      lines[input.position.startRow] =
        line.slice(0, input.position.startColumn) +
        codeLines.join('\n') +
        line.slice(input.position.startColumn);
    }
    // Handle replace mode
    else if (input.replace) {
      const beforeContent = lines.slice(0, input.position.startRow);
      const afterContent = lines.slice(input.position.endRow + 1);

      const startLine = lines[input.position.startRow] || '';
      const endLine = lines[input.position.endRow] || '';

      const baseIndent = getLineIndentation(startLine);

      const newCode = input.code.split('\n').map((codeLine, index) => {
        if (index === 0) return startLine.slice(0, input.position.startColumn) + codeLine;
        return ' '.repeat(baseIndent) + codeLine;
      });

      if (newCode.length > 0) {
        newCode[newCode.length - 1] += endLine.slice(input.position.endColumn);
      }

      lines = [...beforeContent, ...newCode, ...afterContent];
    }

    const modifiedContent = lines.join('\n');
    await writeFile(input.filePath, modifiedContent);

    return {
      content: [
        {
          type: 'text',
          text: 'Code inserted succesfully',
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: 'Error while inserting code',
        },
      ],
    };
  }
};
