import { test, describe } from 'node:test';
import assert from 'node:assert';
import Parser from 'tree-sitter';

// Types and Interfaces
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

// Constants
const BUILT_INS = new Set([
  'string', 'number', 'boolean', 'void', 'null', 'undefined',
  'Promise', 'Array', 'Map', 'Set', 'Object', 'Function',
  'any', 'unknown', 'never', 'this', 'super', 'console', 'String'
]);

const DECLARATION_TYPES = new Set([
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

const NODE_TYPE_TO_KIND: Record<string, DefinitionKind> = {
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

// Node Type Checkers
const isDeclarationNode = (node: Parser.SyntaxNode): boolean => 
  DECLARATION_TYPES.has(node.type);

const isMethodDefinition = (node: Parser.SyntaxNode): boolean => 
  node.type === 'method_definition';

const isPublicFieldDefinition = (node: Parser.SyntaxNode): boolean => 
  node.type === 'public_field_definition';

// Position Helpers
const createPosition = (node: Parser.SyntaxNode): Position => ({
  start: {
    offset: node.startIndex,
    line: node.startPosition.row,
    column: node.startPosition.column
  },
  end: {
    offset: node.endIndex,
    line: node.endPosition.row,
    column: node.endPosition.column
  }
});

// Node Finding and Collection
const findMemberDefinition = (node: Parser.SyntaxNode): FindNodeResult | undefined => {
  if (!isMethodDefinition(node) && !isPublicFieldDefinition(node)) return undefined;
  
  const nameNode = node.childForFieldName('name');
  if (!nameNode) return undefined;
  
  const kind = isMethodDefinition(node) ? 'method' : 'property';
  console.log(`Found ${kind}: ${nameNode.text}`);
  return { node, kind };
};

const collectClassMembers = (node: Parser.SyntaxNode): Map<string, FindNodeResult> => {
  const members = new Map<string, FindNodeResult>();
  
  const addMember = (current: Parser.SyntaxNode) => {
    const member = findMemberDefinition(current);
    if (member) {
      const nameNode = member.node.childForFieldName('name');
      if (nameNode) {
        members.set(nameNode.text, member);
      }
    }
    
    current.children.forEach(addMember);
  };
  
  addMember(node);
  return members;
};

const collectReferences = (node: Parser.SyntaxNode): Map<string, Parser.SyntaxNode[]> => {
  const references = new Map<string, Parser.SyntaxNode[]>();
  console.log(`\nCollecting references for: ${node.type}`);
  
  const addReference = (current: Parser.SyntaxNode) => {
    if (current.type === 'identifier' || current.type === 'property_identifier') {
      if (current.parent?.type !== 'comment') {  // Skip identifiers in comments
        const text = current.text;
        const nodes = references.get(text) || [];
        nodes.push(current);
        references.set(text, nodes);
      }
    }
    
    // Log special node types
    if (current.type === 'interface_body' || current.type === 'formal_parameters') {
      console.log(`Found ${current.type} with ${current.childCount} children`);
      current.children.forEach(child => {
        console.log(`- ${child.type}: ${child.text}`);
      });
    }
    
    current.children.forEach(addReference);
  };
  
  addReference(node);
  
  console.log('References found:', 
    Array.from(references.keys())
      .map(key => `${key} (${references.get(key)?.length || 0})`)
      .join(', ')
  );
  
  return references;
};

const findDefinitionInTree = (tree: Parser.Tree, identifier: string): FindNodeResult | undefined => {
  console.log(`\nSearching for definition of: ${identifier}`);
  
  const findInNode = (node: Parser.SyntaxNode): FindNodeResult | undefined => {
    // Log only for significant nodes
    if (isDeclarationNode(node) || node.type === 'jsx_element') {
      console.log(`Checking declaration: ${node.type}`);
    }
    
    if (isDeclarationNode(node)) {
      const nameNode = node.childForFieldName('name');
      if (nameNode?.text === identifier) {
        const kind = NODE_TYPE_TO_KIND[node.type];
        console.log(`Found declaration: ${node.type} -> ${kind}`);
        if (node.type === 'interface_declaration' || node.type === 'function_declaration') {
          console.log('Node structure:', {
            type: node.type,
            children: node.children.map(c => c.type)
          });
        }
        return kind ? { node, kind } : undefined;
      }
    }
    
    for (const child of node.children) {
      const result = findInNode(child);
      if (result) return result;
    }
  };
  
  return findInNode(tree.rootNode);
};

// Definition Tree Building
const createDefinition = (node: Parser.SyntaxNode, kind: DefinitionKind, sourceCode: string): Definition => ({
  source: sourceCode.slice(node.startIndex, node.endIndex),
  position: createPosition(node),
  kind
});

const buildDefinitionTree = (
  foundNode: FindNodeResult,
  sourceCode: string,
  tree: Parser.Tree,
  processedNodes = new Set<number>()
): DefinitionNode | undefined => {
  if (processedNodes.has(foundNode.node.startIndex)) return undefined;
  processedNodes.add(foundNode.node.startIndex);
  
  console.log(`\nProcessing ${foundNode.kind} definition`);
  
  const nameNode = foundNode.node.childForFieldName('name');
  if (!nameNode) return undefined;
  
  const references = new Map<string, DefinitionNode>();
  
  // Handle different node types
  if (foundNode.kind === 'class') {
    const members = collectClassMembers(foundNode.node);
    console.log('Class members:', Array.from(members.keys()).join(', '));
    
    for (const [memberName, memberNode] of members) {
      const memberDef = buildDefinitionTree(memberNode, sourceCode, tree, processedNodes);
      if (memberDef) references.set(memberName, memberDef);
    }
  }
  
  if (foundNode.kind === 'interface') {
    const body = foundNode.node.childForFieldName('body');
    if (body) {
      console.log('Interface members:', body.children
        .filter(c => c.type === 'property_signature' || c.type === 'method_signature')
        .map(c => c.childForFieldName('name')?.text)
        .join(', ')
      );
    }
  }
  
  const identifiers = collectReferences(foundNode.node);
  
  for (const [id, nodes] of identifiers) {
    if (id === nameNode.text || BUILT_INS.has(id) || references.has(id)) {
      console.log(`Skipping ${id} (self-ref/built-in/processed)`);
      continue;
    }
    
    const defResult = findDefinitionInTree(tree, id);
    if (defResult && !processedNodes.has(defResult.node.startIndex)) {
      console.log(`Processing reference ${id} (${defResult.kind})`);
      const childDef = buildDefinitionTree(defResult, sourceCode, tree, processedNodes);
      if (childDef) references.set(id, childDef);
    } else {
      references.set(id, { identifier: id, references: new Map() });
    }
  }
  
  console.log(`Completed ${foundNode.kind} ${nameNode.text} with ${references.size} references`);
  
  return {
    identifier: nameNode.text,
    definition: createDefinition(foundNode.node, foundNode.kind, sourceCode),
    references
  };
};

// Main Analysis Function
const analyzeDefinition = (sourceCode: string, identifier: string): DefinitionNode | undefined => {
  const parser = new Parser();
  parser.setLanguage(require('tree-sitter-typescript').typescript);
  
  const tree = parser.parse(sourceCode);
  const foundNode = findDefinitionInTree(tree, identifier);
  if (!foundNode) return undefined;
  
  return buildDefinitionTree(foundNode, sourceCode, tree);
};

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

  test('analyze interface declarations', () => {
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
      
      interface Department {
        id: number;
        name: string;
      }
    `;
    
    const personResult = analyzeDefinition(code, 'Person');
    assert.ok(personResult);
    assert.equal(personResult.definition?.kind, 'interface');
    
    const employeeResult = analyzeDefinition(code, 'Employee');
    assert.ok(employeeResult);
    assert.equal(employeeResult.definition?.kind, 'interface');
    assert.ok(employeeResult.references.has('Person'));
    assert.ok(employeeResult.references.has('Department'));
  });

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
  test('analyze functional component', () => {
    const code = `
      interface Props {
        name: string;
        age: number;
      }
      
      function Greeting({ name, age }: Props) {
        const message = \`Hello \${name}, you are \${age} years old\`;
        
        return (
          <div className="greeting">
            <h1>{message}</h1>
            <span>Welcome!</span>
          </div>
        );
      }
    `;
    
    const result = analyzeDefinition(code, 'Greeting');
    assert.ok(result);
    assert.equal(result.definition?.kind, 'function');
    assert.ok(result.references.has('Props'));
    assert.ok(result.references.has('message'));
  });

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
