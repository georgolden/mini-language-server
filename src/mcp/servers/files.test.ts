import { getFileContent } from './files.mjs';

getFileContent('servers/ast.mts', './src/mcp/').then(console.log);
