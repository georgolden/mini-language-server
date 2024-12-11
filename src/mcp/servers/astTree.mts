import { getAllFiles, getFileContent } from './files.mjs';
import { parseAndTraverseFile, type Tree } from './smallAst.mjs';
import path from 'node:path';

const parseProjectTree = async (files: string[]) => {
  const projectTree: Record<string, Tree> = {};
  for (const file of files) {
    if (path.extname(file) === '.mts') {
      projectTree[file] = await parseAndTraverseFile(await getFileContent(file, './src/agents/'));
    }
  }

  console.dir(projectTree);
};

const main = async () => {
  parseProjectTree(await getAllFiles('./src/agents/'));
};

main();
