import Parser, { type SyntaxNode } from 'tree-sitter';
import TS from 'tree-sitter-typescript';

export type Position = {
  lineStart: number;
  charStart: number;
  lineEnd: number;
  charEnd: number;
};

export type TreeNode = {
  childNodes?: Tree;
  code: string;
  global: boolean;
  position: Position;
};

export type Tree = Record<string, TreeNode>;

const supportedDeclarations = [
  'variable_declarator',
  'function_declaration',
  'interface_declaration',
  'class_declaration',
  'abstract_class_declaration',
  'method_definition',
  'constructor_definition',
  'public_field_definition',
  'type_alias_declaration',
  'enum_declaration',
];

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

  const nodeOriginalName = path[path.length - 1] as string;
  const nodeName = nodeOriginalName === 'constructor' ? 'class_constructor' : nodeOriginalName;

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

export async function parseAndTraverseFile(sourceCode: string) {
  const parser = new Parser();
  parser.setLanguage(TS.typescript);
  const tree = parser.parse(sourceCode);
  const simpleTree: Tree = {};

  traverseAllNodes(tree.rootNode, supportedDeclarations, (node, ancestors) => {
    if (node.isNamed) {
      const name = node.children.find((el) => el.type.includes('identifier'))?.text;
      if (!name) return;

      const isDefinitionType = (type: string) => supportedDeclarations.includes(type);

      const getNodeName = (node: SyntaxNode) => {
        return node.children.find((el) => el.type.includes('identifier'))?.text;
      };

      const ancestorPath = ancestors
        .map((ancestor) => {
          if (isDefinitionType(ancestor.type)) {
            return getNodeName(ancestor);
          }
          return null;
        })
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
  });

  return simpleTree;
}
