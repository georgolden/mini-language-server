import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { getAllFiles, getFileContent } from './index.js';

const SummarizeRequest = z.object({
  path: z.string().optional().describe('Optional path to the subdir'),
});
const SummarizeFilesSchema = z.object({
  path: z.string().optional().describe('Optional path to the subdir'),
});

export const summarizeFilesTool = {
  name: 'summarize_files_content',
  description:
    'Analyze and provide concise summaries of the contents of specified files within the project. ' +
    'This tool reads the content of each file and generates a comprehensive summary of their key points, ' +
    'structure, and main functionality. It helps in quickly understanding the purpose and content of ' +
    'multiple files without having to read them in detail.',
  inputSchema: zodToJsonSchema(SummarizeFilesSchema),
};

export const summarizeFilesCommand = async (args, { server, logger }) => {
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
};
