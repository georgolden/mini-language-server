import { getFileContent } from './files.js';

getFileContent('servers/ast.mts', './src/mcp/').then(console.log);
