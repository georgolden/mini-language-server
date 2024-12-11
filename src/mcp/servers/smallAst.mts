import Parser, { type SyntaxNode } from 'tree-sitter';
import TS from 'tree-sitter-typescript';

type Position = {
  lineStart: number;
  charStart: number;
  lineEnd: number;
  charEnd: number;
};

type TreeNode = {
  childNodes?: Tree;
  code: string;
  global: boolean;
  position: Position;
};

type Tree = Record<string, TreeNode>;

function traverseAllNodes(
  node: Parser.SyntaxNode,
  types: string[],
  callback: (node: Parser.SyntaxNode, ancestors: Parser.SyntaxNode[]) => void,
  ancestors: Parser.SyntaxNode[] = [],
) {
  if (types.includes(node.type)) {
    callback(node, ancestors);
  }
  for (const child of node.children) {
    traverseAllNodes(child, types, callback, [...ancestors, node]);
  }
}

function addToNestedTree(tree: Tree, path: string[], node: Omit<TreeNode, 'childNodes'>): void {
  let current: Record<string, TreeNode> = tree;

  for (let i = 0; i < path.length - 1; i++) {
    const ancestorName = path[i] as string;

    if (!current[ancestorName]) {
      current[ancestorName] = {
        code: '',
        childNodes: {},
        global: false,
        position: {
          charEnd: 0,
          lineEnd: 0,
          lineStart: 0,
          charStart: 0,
        },
      };
    }

    const currentNode = current[ancestorName] as TreeNode;
    if (!currentNode.childNodes) {
      currentNode.childNodes = {};
    }

    current = currentNode.childNodes;
  }

  const nodeName = path[path.length - 1] as string;
  if (!current[nodeName]) {
    current[nodeName] = {
      ...node,
      childNodes: {},
    };
  }
}

const isGlobal = (node: SyntaxNode) => {
  // in case we have var we need to get parent of parent
  // cause parent of variable_declarator is lexical_declaration
  // we should also later extract the type of lexical_declaration
  // so llm knows if we can edit it or not
  if (node.type === 'variable_declarator') {
    const parent = node.parent;
    if (parent?.type !== 'lexical_declaration') return false;

    return parent?.parent?.type === 'export_statement';
  }
  return node.parent?.type === 'export_statement';
};

async function parseAndTraverseFile(sourceCode: string) {
  const parser = new Parser();
  parser.setLanguage(TS.typescript);
  const tree = parser.parse(sourceCode);
  const simpleTree: Tree = {};

  traverseAllNodes(
    tree.rootNode,
    [
      'variable_declarator',
      'function_declaration',
      'interface_declaration',
      'class_declaration',
      'type_alias_declaration',
    ],
    (node, ancestors) => {
      if (node.isNamed) {
        const name = node.children.find((el) => el.type === 'identifier')?.text;
        if (!name) return;

        const ancestorPath = ancestors
          .map((ancestor) => ancestor.children.find((el) => el.type === 'identifier')?.text)
          .filter((name): name is string => !!name);

        const fullPath = [...ancestorPath, name];

        addToNestedTree(simpleTree, fullPath, {
          code: node.text,
          global: isGlobal(node),
          position: {
            lineStart: node.startPosition.row,
            charStart: node.startPosition.column,
            lineEnd: node.endPosition.row,
            charEnd: node.endPosition.column,
          },
        });
      }
    },
  );

  return simpleTree;
}

