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
  | 'property';

interface DefinitionNode {
  identifier: string;
  definition?: Definition;
  references: Map<string, DefinitionNode>;
}

interface FindNodeResult {
  node: Parser.SyntaxNode;
  kind: DefinitionKind;
}

// Node types that should be completely ignored for identifier collection
const IGNORE_NODE_TYPES = new Set([
  'method_signature', // Interface method declarations
  'required_parameter', // Function/method parameters
  'property_signature', // Interface property declarations
  'member_expression', // Object property access
  'constructor', // Class constructor
  'string',
  'template_string',
  'comment',
  'jsx_text',
  'jsx_attribute',
]);

// Special method names that are part of standard objects
const STANDARD_MEMBERS = new Set([
  'toString',
  'toUpperCase',
  'toLowerCase',
  'valueOf',
  'constructor',
]);

// Node type mappings for definitions
const DEFINITION_NODE_TYPES: Record<string, DefinitionKind> = {
  class_declaration: 'class',
  interface_declaration: 'interface',
  enum_declaration: 'enum',
  type_alias_declaration: 'type',
  method_definition: 'method',
  public_field_definition: 'property',
  variable_declarator: 'variable',
  function_declaration: 'function',
};

// Node types that can contain valid identifiers but aren't definitions
const REFERENCE_NODE_TYPES = new Set(['identifier', 'type_identifier', 'property_identifier']);

// Node types where identifiers should be ignored
const IGNORE_PARENT_TYPES = new Set([
  'string',
  'template_string',
  'comment',
  'jsx_text',
  'jsx_attribute',
  'property_signature', // Interface property names
  'shorthand_property_identifier', // Object literal shorthand
  'shorthand_property_identifier_pattern', // Destructuring pattern
]);

function isValidDefinitionNode(node: Parser.SyntaxNode): boolean {
  return node.type in DEFINITION_NODE_TYPES && !IGNORE_NODE_TYPES.has(node.type);
}

function isValidIdentifierNode(node: Parser.SyntaxNode): boolean {
  // Must be a recognized identifier type
  if (!REFERENCE_NODE_TYPES.has(node.type)) return false;

  // Parent check for contexts we want to ignore
  const parent = node.parent;
  if (!parent || IGNORE_PARENT_TYPES.has(parent.type)) return false;

  return true;
}

function isDefinitionNode(node: Parser.SyntaxNode): boolean {
  return node.type in DEFINITION_NODE_TYPES;
}

function getDefinitionKind(nodeType: string): DefinitionKind | undefined {
  return DEFINITION_NODE_TYPES[nodeType];
}

function findDefinitionNode(tree: Parser.Tree, identifier: string): FindNodeResult | undefined {
  console.log(`\nLooking for definition of: ${identifier}`);

  function traverse(node: Parser.SyntaxNode): FindNodeResult | undefined {
    if (isDefinitionNode(node)) {
      const nameNode = node.childForFieldName('name');
      if (nameNode?.text === identifier) {
        const kind = getDefinitionKind(node.type);
        if (kind) {
          console.log(`Found definition node: ${node.type} -> ${kind}`);
          return { node, kind };
        }
      }
    }

    for (const child of node.children) {
      const result = traverse(child);
      if (result) return result;
    }
  }

  return traverse(tree.rootNode);
}

function collectIdentifierReferences(node: Parser.SyntaxNode): Map<string, Parser.SyntaxNode[]> {
  const references = new Map<string, Parser.SyntaxNode[]>();

  function traverse(current: Parser.SyntaxNode) {
    if (isValidIdentifierNode(current)) {
      const text = current.text;
      console.log(`Found identifier: ${text} in ${current.parent?.type}`);
      const nodes = references.get(text) || [];
      nodes.push(current);
      references.set(text, nodes);
    }

    current.children.forEach(traverse);
  }

  traverse(node);
  return references;
}

function collectValidReferences(node: Parser.SyntaxNode): Map<string, Parser.SyntaxNode[]> {
  const references = new Map<string, Parser.SyntaxNode[]>();
  const processedIdentifiers = new Set<string>();

  function traverse(current: Parser.SyntaxNode) {
    // Skip ignored node types and their children
    if (IGNORE_NODE_TYPES.has(current.type)) {
      return;
    }

    // Only collect identifiers in valid contexts
    if (
      (current.type === 'identifier' || current.type === 'type_identifier') &&
      !STANDARD_MEMBERS.has(current.text)
    ) {
      const parent = current.parent;
      if (parent && !IGNORE_NODE_TYPES.has(parent.type)) {
        // For member expressions, only collect if it's not the property part
        if (
          parent.type === 'member_expression' &&
          parent.childForFieldName('property') === current
        ) {
          return;
        }

        const text = current.text;
        if (!processedIdentifiers.has(text)) {
          const nodes = references.get(text) || [];
          nodes.push(current);
          references.set(text, nodes);
          processedIdentifiers.add(text);
        }
      }
    }

    current.children.forEach(traverse);
  }

  traverse(node);
  return references;
}

function buildDefinitionTree(
  foundNode: FindNodeResult,
  sourceCode: string,
  tree: Parser.Tree,
  processedNodes = new Set<number>(),
): DefinitionNode | undefined {
  if (processedNodes.has(foundNode.node.startIndex)) return undefined;
  processedNodes.add(foundNode.node.startIndex);

  const nameNode = foundNode.node.childForFieldName('name');
  if (!nameNode) return undefined;

  const references = new Map<string, DefinitionNode>();
  const seenIdentifiers = new Set<string>();

  // Collect references first to maintain definition consistency
  const identifiers = collectValidReferences(foundNode.node);

  for (const [id, nodes] of identifiers) {
    // Skip self-references and already processed identifiers
    if (id === nameNode.text || seenIdentifiers.has(id)) continue;
    seenIdentifiers.add(id);

    const defResult = findDefinitionNode(tree, id);
    if (defResult && !processedNodes.has(defResult.node.startIndex)) {
      const childDef = buildDefinitionTree(defResult, sourceCode, tree, processedNodes);
      if (childDef) references.set(id, childDef);
    } else {
      // Only include undefined references that could potentially be defined elsewhere
      if (
        nodes.some(
          (n) =>
            n.type === 'type_identifier' ||
            (n.type === 'identifier' && !IGNORE_NODE_TYPES.has(n.parent?.type)),
        )
      ) {
        references.set(id, {
          identifier: id,
          references: new Map(),
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
          column: foundNode.node.startPosition.column,
        },
        end: {
          offset: foundNode.node.endIndex,
          line: foundNode.node.endPosition.row,
          column: foundNode.node.endPosition.column,
        },
      },
      kind: foundNode.kind,
    },
    references,
  };
}

function analyzeDefinition(sourceCode: string, identifier: string): DefinitionNode | undefined {
  const parser = new Parser();
  parser.setLanguage(require('tree-sitter-typescript').typescript);

  const tree = parser.parse(sourceCode);
  const foundNode = findDefinitionNode(tree, identifier);
  if (!foundNode) return undefined;

  return buildDefinitionTree(foundNode, sourceCode, tree);
}

test('analyze interface references', () => {
  const code = `
    interface Person {
      name: string;
      age: number;
      greet(prefix: string): string;
    }
    
    interface Employee extends Person {
      salary: number;
      department: Department;
    }
  `;

  const result = analyzeDefinition(code, 'Employee');
  console.dir(result, { depth: 10 });
  assert.ok(result);
  assert.equal(result.definition?.kind, 'interface');

  // Should only include actual type references
  assert.ok(result.references.has('Person'));
  assert.ok(result.references.has('Department'));
  assert.equal(result.references.size, 2, 'Should only have type references');

  // Check Person's references
  const personRef = result.references.get('Person');
  assert.ok(personRef?.definition, 'Person should have definition');
  assert.equal(personRef?.references.size, 0, 'Person should not have method/param references');
});

test('analyze class members', () => {
  const code = `
    class Example {
      private data: string;
      
      constructor(input: string) {
        this.data = input;
      }
      
      process(): string {
        return this.data.toUpperCase();
      }
    }
  `;

  const result = analyzeDefinition(code, 'Example');
  console.dir(result, { depth: 10 });
  assert.ok(result);
  assert.equal(result.definition?.kind, 'class');

  // Should only include property and method definitions
  assert.ok(result.references.has('data'));
  assert.ok(result.references.has('process'));
  assert.ok(!result.references.has('input'), 'Should not include parameters');
  assert.ok(!result.references.has('toUpperCase'), 'Should not include standard methods');
  assert.ok(!result.references.has('constructor'), 'Should not include constructor');

  const dataRef = result.references.get('data');
  assert.equal(dataRef?.definition?.kind, 'property');

  const processRef = result.references.get('process');
  assert.equal(processRef?.definition?.kind, 'method');
  assert.equal(processRef?.references.size, 0, 'Method should not have internal refs');
});

// Tests
describe('TypeScript Definition Analysis', () => {
  // test('analyze class definition', () => {
  //   const code = `
  //     class TestClass {
  //       private field: string;
  //       constructor(param: string) {
  //         this.field = param;
  //       }
  //       method(x: number): string {
  //         const local = this.field;
  //         return String(x + local);
  //       }
  //     }
  //   `;
  //   const result = analyzeDefinition(code, 'TestClass');
  //   assert.ok(result);
  //   assert.equal(result.identifier, 'TestClass');
  //   assert.equal(result.definition?.kind, 'class');
  //   assert.ok(result.references.has('field'));
  //   assert.ok(result.references.has('method'));
  //   const method = result.references.get('method');
  //   assert.equal(method?.definition?.kind, 'method');
  // });
  // test('analyze function declarations', () => {
  //   const code = `
  //     function greet(name: string, age?: number): string {
  //       const prefix = "Hello";
  //       return \`\${prefix} \${name}\`;
  //     }
  //     const arrowFn = (x: number) => x * 2;
  //   `;
  //   const greetResult = analyzeDefinition(code, 'greet');
  //   assert.ok(greetResult);
  //   assert.equal(greetResult.definition?.kind, 'function');
  //   assert.ok(greetResult.references.has('prefix'));
  //   assert.ok(greetResult.references.has('name'));
  //   const arrowResult = analyzeDefinition(code, 'arrowFn');
  //   assert.ok(arrowResult);
  //   assert.equal(arrowResult.definition?.kind, 'variable');
  //   assert.ok(arrowResult.references.has('x'));
  // });
  // test('analyze interface declarations', () => {
  //   const code = `
  //     interface Person {
  //       name: string;
  //       age: number;
  //       greet(prefix: string): string;
  //     }
  //     interface Employee extends Person {
  //       salary: number;
  //       department: Department;
  //     }
  //     interface Department {
  //       id: number;
  //       name: string;
  //     }
  //   `;
  //   const personResult = analyzeDefinition(code, 'Person');
  //   assert.ok(personResult);
  //   assert.equal(personResult.definition?.kind, 'interface');
  //   const employeeResult = analyzeDefinition(code, 'Employee');
  //   assert.ok(employeeResult);
  //   assert.equal(employeeResult.definition?.kind, 'interface');
  //   assert.ok(employeeResult.references.has('Person'));
  //   assert.ok(employeeResult.references.has('Department'));
  // });
  // test('analyze type aliases', () => {
  //   const code = `
  //     type StringOrNumber = string | number;
  //     type Callback<T> = (data: T) => void;
  //     type UserRole = 'admin' | 'user' | 'guest';
  //     type ResponseData<T> = {
  //       data: T;
  //       status: number;
  //       message: string;
  //     };
  //   `;
  //   const typeResult = analyzeDefinition(code, 'StringOrNumber');
  //   assert.ok(typeResult);
  //   assert.equal(typeResult.definition?.kind, 'type');
  //   const callbackResult = analyzeDefinition(code, 'Callback');
  //   assert.ok(callbackResult);
  //   assert.equal(callbackResult.definition?.kind, 'type');
  // });
  // test('analyze class with decorators', () => {
  //   const code = `
  //     @Component({
  //       selector: 'app-root'
  //     })
  //     class AppComponent {
  //       @Input() title: string;
  //       @Output()
  //       valueChange = new EventEmitter<string>();
  //       @HostListener('click')
  //       onClick() {
  //         this.valueChange.emit(this.title);
  //       }
  //     }
  //   `;
  //   const result = analyzeDefinition(code, 'AppComponent');
  //   assert.ok(result);
  //   assert.equal(result.definition?.kind, 'class');
  //   assert.ok(result.references.has('title'));
  //   assert.ok(result.references.has('valueChange'));
  //   assert.ok(result.references.has('onClick'));
  // });
  // test('analyze enum declarations', () => {
  //   const code = `
  //     enum Direction {
  //       Up = "UP",
  //       Down = "DOWN",
  //       Left = "LEFT",
  //       Right = "RIGHT"
  //     }
  //     const enum HttpStatus {
  //       OK = 200,
  //       NotFound = 404,
  //       Error = 500
  //     }
  //   `;
  //   const dirResult = analyzeDefinition(code, 'Direction');
  //   assert.ok(dirResult);
  //   assert.equal(dirResult.definition?.kind, 'enum');
  //   const statusResult = analyzeDefinition(code, 'HttpStatus');
  //   assert.ok(statusResult);
  //   assert.equal(statusResult.definition?.kind, 'enum');
  // });
  // test('analyze class with generics', () => {
  //   const code = `
  //     class Container<T> {
  //       private value: T;
  //       constructor(initial: T) {
  //         this.value = initial;
  //       }
  //       getValue(): T {
  //         return this.value;
  //       }
  //       setValue(newValue: T): void {
  //         this.value = newValue;
  //       }
  //     }
  //   `;
  //   const result = analyzeDefinition(code, 'Container');
  //   assert.ok(result);
  //   assert.equal(result.definition?.kind, 'class');
  //   assert.ok(result.references.has('value'));
  //   assert.ok(result.references.has('getValue'));
  //   assert.ok(result.references.has('setValue'));
  // });
});

describe('TSX Definition Analysis', () => {
  // test('analyze functional component', () => {
  //   const code = `
  //     interface Props {
  //       name: string;
  //       age: number;
  //     }
  //     function Greeting({ name, age }: Props) {
  //       const message = \`Hello \${name}, you are \${age} years old\`;
  //       return (
  //         <div className="greeting">
  //           <h1>{message}</h1>
  //           <span>Welcome!</span>
  //         </div>
  //       );
  //     }
  //   `;
  //   const result = analyzeDefinition(code, 'Greeting');
  //   assert.ok(result);
  //   assert.equal(result.definition?.kind, 'function');
  //   assert.ok(result.references.has('Props'));
  //   assert.ok(result.references.has('message'));
  // });
  // test('analyze class component', () => {
  //   const code = `
  //     class Counter extends React.Component<Props, State> {
  //       state = {
  //         count: 0
  //       };
  //       increment = () => {
  //         this.setState(prev => ({
  //           count: prev.count + 1
  //         }));
  //       };
  //       render() {
  //         return (
  //           <button onClick={this.increment}>
  //             Count: {this.state.count}
  //           </button>
  //         );
  //       }
  //     }
  //   `;
  //   const result = analyzeDefinition(code, 'Counter');
  //   assert.ok(result);
  //   assert.equal(result.definition?.kind, 'class');
  //   assert.ok(result.references.has('state'));
  //   assert.ok(result.references.has('increment'));
  //   assert.ok(result.references.has('render'));
  // });
  // test('analyze component with hooks', () => {
  //   const code = `
  //     function TodoList() {
  //       const [todos, setTodos] = useState<string[]>([]);
  //       const inputRef = useRef<HTMLInputElement>(null);
  //       useEffect(() => {
  //         console.log('Todos updated:', todos);
  //       }, [todos]);
  //       const addTodo = () => {
  //         if (inputRef.current) {
  //           setTodos([...todos, inputRef.current.value]);
  //           inputRef.current.value = '';
  //         }
  //       };
  //       return (
  //         <div>
  //           <input ref={inputRef} />
  //           <button onClick={addTodo}>Add</button>
  //           {todos.map(todo => (
  //             <div key={todo}>{todo}</div>
  //           ))}
  //         </div>
  //       );
  //     }
  //   `;
  //   const result = analyzeDefinition(code, 'TodoList');
  //   assert.ok(result);
  //   assert.equal(result.definition?.kind, 'function');
  //   assert.ok(result.references.has('todos'));
  //   assert.ok(result.references.has('setTodos'));
  //   assert.ok(result.references.has('inputRef'));
  //   assert.ok(result.references.has('addTodo'));
  // });
});
