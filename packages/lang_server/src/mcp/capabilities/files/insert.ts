import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { IFSManager } from '../../interfaces/FSManager.js';

const InsertCodeSchema = z.object({
  replace: z.boolean().optional().describe('Position to replace the code'),
  code: z.string().describe('Code to insert'),
  filePath: z.string().describe('Path to the existing file to insert code to'),
  position: z.object({
    startRow: z.number().describe('Start line'),
    startColumn: z.number().describe('Start character'),
    endRow: z.number().describe('End line'), 
    endColumn: z.number().describe('End character'),
  }).describe('Position to insert at, if start and end line/character are equal we just insert code instead of replacing'),
});

export const insertCodeTool = {
  name: 'insert_code',
  description: 'Inserts or appends code snippets into a specified file at a given position. ' +
    'Supports intelligent code insertion with proper indentation and formatting. ' +
    'Handles multiple programming languages and maintains code structure. ' +
    'Includes validation to prevent syntax errors from incorrect insertions. ' +
    'Can only take existing file as argument.',
  inputSchema: zodToJsonSchema(InsertCodeSchema),
};

export const insertCodeCommand = async (
  { fsManager }: { fsManager: IFSManager },
  input: z.infer<typeof InsertCodeSchema>
) => {
  try {
    await fsManager.insertCode({
      ...input,
      replace: input.replace ?? false
    });
    return {
      content: [{
        type: 'text',
        text: 'Code inserted successfully'
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text', 
        text: 'Error while inserting code'
      }]
    };
  }
};
