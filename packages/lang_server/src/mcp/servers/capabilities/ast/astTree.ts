import { getAllFiles, getFileContent } from '../files/index';
import { parseAndTraverseFile, type Tree, type TreeNode } from './smallAst';
import path from 'node:path';

export const parseProjectTree = async (files: string[]) => {
  const projectTree: Record<string, Tree> = {};
  for (const file of files) {
    if (['.mts', '.ts'].includes(path.extname(file))) {
      projectTree[file] = await parseAndTraverseFile(await getFileContent(file, './packages/lang_server/src/agents/'));
    }
  }

  return projectTree;
};

function isPositionWithinNode(position: { line: number; column: number }, node: TreeNode): boolean {
  return (
    (position.line > node.position.lineStart ||
      (position.line === node.position.lineStart && position.column >= node.position.charStart)) &&
    (position.line < node.position.lineEnd ||
      (position.line === node.position.lineEnd && position.column <= node.position.charEnd))
  );
}

export const getAvailableDeclarations = (
  projectTree: Record<string, Tree>,
  targetFile: string,
  line: number,
  column: number,
): Array<{ file: string; name: string; node: TreeNode }> => {
  const availableDeclarations: Array<{ file: string; name: string; node: TreeNode }> = [];
  const position = { line, column };

  function processTree(
    tree: Tree,
    file: string,
    parentChain: Array<{ name: string; node: TreeNode }> = [],
  ) {
    for (const [name, node] of Object.entries(tree)) {
      if (node.global) {
        availableDeclarations.push({ file, name, node });
        continue;
      }

      if (file === targetFile) {
        const isWithin = isPositionWithinNode(position, node);

        const isSiblingOrParent =
          parentChain.some((parent) => isPositionWithinNode(position, parent.node)) || !isWithin;

        if (isSiblingOrParent) {
          availableDeclarations.push({ file, name, node });
        }
      }

      if (node.childNodes) {
        processTree(node.childNodes, file, [...parentChain, { name, node }]);
      }
    }
  }

  for (const [file, tree] of Object.entries(projectTree)) {
    if (file === targetFile) {
      processTree(tree, file);
    } else {
      for (const [name, node] of Object.entries(tree)) {
        if (node.global) {
          availableDeclarations.push({ file, name, node });
        }
      }
    }
  }

  return availableDeclarations;
};

const main = async () => {
  console.log(await getAllFiles('./packages/lang_server/src/agents/'))
  const tree = await parseProjectTree(await getAllFiles('./packages/lang_server/src/agents/'));

  console.log(JSON.stringify(tree, null, 2));
  //console.log(
  //  getAvailableDeclarations(
  //    tree,
  //    Object.keys(tree).find((el) => el.includes('claude.mts')) as string,
  //    20,
  //    0,
  //  ),
  //);
};

main();
