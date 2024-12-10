import { z } from 'zod';

export const GetProjectFiles = z.object({
  path: z.string().describe('Required! Path to the project to list files from'),
});

//export const SummarizeRequest = z.object({
//  summary: z.string().describe('Required! Quick summary of content of the file. 200 words max'),
//});
export const SummarizeRequest = z.any();
