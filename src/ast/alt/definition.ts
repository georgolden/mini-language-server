import { test, describe } from 'node:test';
import assert from 'node:assert';
import Parser from 'tree-sitter';

interface Position {
  start: { offset: number; line: number; column: number };
  end: { offset: number; line: number; column: number };
}

interface Definition {
  source: string;
  position: Position;
  kind: DefinitionKind;
}

type DefinitionKind = 
  | 'function' 
  | 'variable' 
  | 'class' 
  | 'interface' 
  | 'type' 
  | 'enum' 
  | 'method'
  | 'property'
  | 'parameter'
  | 'jsx';

interface DefinitionNode {
  identifier: string;
  definition?: Definition;
  references: Map<string, DefinitionNode>;
}

interface FindNodeResult {
  node: Parser.SyntaxNode;
  kind: DefinitionKind;
}

interface IdentifierInfo {
  node: Parser.SyntaxNode;
  isDeclared: boolean;
}

const BUILT_INS = new Set([
  'string', 'number', 'boolean', 'void', 'null', 'undefined',
  'Promise', 'Array', 'Map', 'Set', 'Object', 'Function',
  'any', 'unknown', 'never', 'this', 'super', 'console', 'String'
]);

function isDeclarationNode(node: Parser.SyntaxNode): boolean {
  const declarationTypes = new Set([
    'class_declaration',
    'interface_declaration',
    'enum_declaration',
    'type_alias_declaration',
    'method_definition',
    'public_field_definition',
    'required_parameter',
    'function_declaration',
    'variable_declarator'
  ]);
  return declarationTypes.has(node.type);
}

function findClassMember(node: Parser.SyntaxNode): FindNodeResult | undefined {
  if (node.type === 'method_definition') {
    const nameNode = node.childForFieldName('name');
    if (nameNode) {
      console.log(`Found method: ${nameNode.text}`);
      return { node, kind: 'method' };
    }
  }
  
  if (node.type === 'public_field_definition') {
    const nameNode = node.childForFieldName('name');
    if (nameNode) {
      console.log(`Found field: ${nameNode.text}`);
      return { node, kind: 'property' };
    }
  }
  
  return undefined;
}

function collectMembers(node: Parser.SyntaxNode): Map<string, FindNodeResult> {
  const members = new Map<string, FindNodeResult>();
  
  function traverse(current: Parser.SyntaxNode) {
    const member = findClassMember(current);
    if (member) {
      const nameNode = member.node.childForFieldName('name');
      if (nameNode) {
        members.set(nameNode.text, member);
      }
    }
    
    for (const child of current.children) {
      traverse(child);
    }
  }
  
  traverse(node);
  return members;
}

function findDefinitionNode(tree: Parser.Tree, identifier: string): FindNodeResult | undefined {
  function traverse(node: Parser.SyntaxNode): FindNodeResult | undefined {
    if (isDeclarationNode(node)) {
      const nameNode = node.childForFieldName('name');
      if (nameNode?.text === identifier) {
        console.log(`Found definition for '${identifier}' in ${node.type}`);
        const kind = getDefinitionKind(node.type);
        return kind ? { node, kind } : undefined;
      }
    }
    
    // Also check for class members when searching for definitions
    const member = findClassMember(node);
    if (member) {
      const nameNode = member.node.childForFieldName('name');
      if (nameNode?.text === identifier) {
        return member;
      }
    }
    
    for (const child of node.children) {
      const result = traverse(child);
      if (result) return result;
    }
  }
  
  return traverse(tree.rootNode);
}


function getDefinitionKind(nodeType: string): DefinitionKind | undefined {
  const kindMap: Record<string, DefinitionKind> = {
    'class_declaration': 'class',
    'interface_declaration': 'interface',
    'enum_declaration': 'enum',
    'type_alias_declaration': 'type',
    'method_definition': 'method',
    'public_field_definition': 'property',
    'required_parameter': 'parameter',
    'function_declaration': 'function',
    'variable_declarator': 'variable'
  };
  return kindMap[nodeType];
}

function collectReferenceNodes(node: Parser.SyntaxNode): Map<string, Parser.SyntaxNode[]> {
  const references = new Map<string, Parser.SyntaxNode[]>();
  
  function traverse(current: Parser.SyntaxNode) {
    console.log(`Traversing for refs: ${current.type}`);
    
    if (current.type === 'identifier') {
      console.log(`Found identifier ref: ${current.text} in ${current.parent?.type}`);
      const text = current.text;
      const nodes = references.get(text) || [];
      nodes.push(current);
      references.set(text, nodes);
    }

    if (current.type === 'method_definition') {
      console.log('Method structure:', {
        type: current.type,
        name: current.childForFieldName('name')?.text,
        children: current.children.map(c => ({ type: c.type, text: c.text }))
      });
    }

    if (current.type === 'property_identifier') {
      console.log(`Found property: ${current.text} in ${current.parent?.type}`);
    }
    
    for (const child of current.children) {
      traverse(child);
    }
  }
  
  traverse(node);
  
  console.log('Reference collection results:');
  for (const [id, nodes] of references.entries()) {
    console.log(`- ${id}: ${nodes.length} occurrences in ${nodes.map(n => n.parent?.type).join(', ')}`);
  }
  
  return references;
}

function buildDefinitionTree(
  foundNode: FindNodeResult,
  sourceCode: string,
  tree: Parser.Tree,
  processedNodes = new Set<number>()
): DefinitionNode | undefined {
  if (processedNodes.has(foundNode.node.startIndex)) {
    return undefined;
  }
  
  processedNodes.add(foundNode.node.startIndex);
  console.log(`\nProcessing ${foundNode.kind} definition: ${foundNode.node.type}`);
  
  const nameNode = foundNode.node.childForFieldName('name');
  if (!nameNode) return undefined;
  
  const references = new Map<string, DefinitionNode>();
  
  // If this is a class declaration, collect its members first
  if (foundNode.kind === 'class') {
    const members = collectMembers(foundNode.node);
    console.log('Class members:', Array.from(members.keys()));
    
    for (const [memberName, memberNode] of members) {
      const memberDef = buildDefinitionTree(memberNode, sourceCode, tree, processedNodes);
      if (memberDef) {
        references.set(memberName, memberDef);
      }
    }
  }
  
  // Collect other references
  const identifiers = collectReferenceNodes(foundNode.node);
  for (const [id, nodes] of identifiers) {
    if (id === nameNode.text || BUILT_INS.has(id)) {
      continue;
    }
    
    if (!references.has(id)) {  // Skip if already processed as a member
      const defResult = findDefinitionNode(tree, id);
      if (defResult && !processedNodes.has(defResult.node.startIndex)) {
        const childDef = buildDefinitionTree(defResult, sourceCode, tree, processedNodes);
        if (childDef) {
          references.set(id, childDef);
        }
      } else {
        references.set(id, {
          identifier: id,
          references: new Map()
        });
      }
    }
  }
  
  return {
    identifier: nameNode.text,
    definition: {
      source: sourceCode.slice(foundNode.node.startIndex, foundNode.node.endIndex),
      position: {
        start: {
          offset: foundNode.node.startIndex,
          line: foundNode.node.startPosition.row,
          column: foundNode.node.startPosition.column
        },
        end: {
          offset: foundNode.node.endIndex,
          line: foundNode.node.endPosition.row,
          column: foundNode.node.endPosition.column
        }
      },
      kind: foundNode.kind
    },
    references
  };
}

function analyzeDefinition(sourceCode: string, identifier: string): DefinitionNode | undefined {
  const parser = new Parser();
  parser.setLanguage(require('tree-sitter-typescript').typescript);
  
  const tree = parser.parse(sourceCode);
  console.log(`\nAnalyzing '${identifier}'...`);
  
  const foundNode = findDefinitionNode(tree, identifier);
  if (!foundNode) {
    console.log('No definition found');
    return undefined;
  }
  
  const result = buildDefinitionTree(foundNode, sourceCode, tree);
  console.log('\nAnalysis result:', result?.identifier, result?.definition?.kind);
  return result;
}

test('analyze class definition', () => {
  const code = `
    class TestClass {
      private field: string;
      
      constructor(param: string) {
        this.field = param;
      }
      
      method(x: number): string {
        const local = this.field;
        return String(x + local);
      }
    }
  `;
  
  const result = analyzeDefinition(code, 'TestClass');
  
  assert.ok(result);
  assert.equal(result.identifier, 'TestClass');
  assert.equal(result.definition?.kind, 'class');
  
  assert.ok(result.references.has('field'));
  assert.ok(result.references.has('method'));
  
  const method = result.references.get('method');
  assert.equal(method?.definition?.kind, 'method');
});
