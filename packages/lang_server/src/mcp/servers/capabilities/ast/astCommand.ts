import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const GetAvailableSymbolsSchema = z.object({
  row: z.string().describe('Line number'),
  column: z.string().describe(''),
});

export const getAvailableSymbolsTool = {
  name: 'get_available_symbols',
  description:
    'Retrieves all accessible named symbols (variables, functions, classes) that ' +
    'are in scope for a specific symbol location. Includes imported modules, ' +
    'global variables, and local definitions. Provides context-aware symbol ' +
    'information for code completion and reference checking features.',
  inputSchema: zodToJsonSchema(GetAvailableSymbolsSchema),
};

// will be used before llm is trying to adjust any code
// it will provide context of what can be used in the project
// can be super bloated so samplings should be integrated
export const getAvailableSymbols = () => {
  return {};
};
