import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { getAllFiles } from './index.js';

const GetProjectFiles = z.object({
  path: z.string().describe('Required! Path to the project directory to list files from'),
});

export const getProjectFilesTool = {
  name: 'get_project_files',
  description:
    'retrieve a list of all files available within the project by provided path. ' +
    'path should be a valid string that leads to a project where user wants ' +
    'to get files from. it will provide information about all the files except ' +
    'those listed inside of .gitignore. ',
  inputSchema: zodToJsonSchema(GetProjectFiles),
};

export const getProjectFilesCommand = async (args) => {
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
};
