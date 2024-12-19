import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const GetFileContent = z.object({
  path: z.string().optional().describe('Optional path to the subdir'),
  file: z.string().describe('Path to the file to get content from'),
});

export const getFileContentTool = {
  name: 'get_file_content',
  description: '',
  inputSchema: zodToJsonSchema(GetFileContent),
};

export const getFileContentCommand = async (args) => {
  const { file, path } = args;

  if (!path) {
    throw new Error('No path for get_file_content command!');
  }

  return {
    content: [
      {
        type: 'text',
        text: await getFileContent(file, path),
      },
    ],
  };
};
