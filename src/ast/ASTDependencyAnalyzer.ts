import Parser from 'tree-sitter';
import { readFile } from 'fs/promises';
import * as path from 'path';

interface SourcePosition {
  start: { line: number; column: number; offset: number };
  end: { line: number; column: number; offset: number };
}

interface DependencyNode {
  identifier: string;
  sourceCode: string;
  position: SourcePosition;
  filePath: string;
  dependencies: Map<string, DependencyNode>; // Changed from Set to Map of full nodes
}

class ASTDependencyAnalyzer {
  parser: Parser;
  private cache: Map<string, DependencyNode> = new Map();
  private processing: Set<string> = new Set();
  private builtInIdentifiers = new Set([
    'string', 'number', 'boolean', 'void', 'null', 'undefined',
    'object', 'symbol', 'bigint', 'any', 'unknown', 'never',
    'Promise', 'Array', 'Map', 'Set', 'this', 'super', 'console',
    'Error', 'Date', 'JSON', 'Math', 'event', 'message'
  ]);

  constructor() {
    this.parser = new Parser();
    // Initialize parser with JavaScript/TypeScript grammar
    this.parser.setLanguage(require('tree-sitter-typescript').typescript);
  }

  async analyzeIdentifierDependencies(
    identifierName: string,
    fromFilePath: string,
  ): Promise<DependencyNode | null> {
    const cacheKey = `${fromFilePath}:${identifierName}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    if (this.processing.has(cacheKey)) {
      return null;
    }

    if (this.builtInIdentifiers.has(identifierName)) {
      return null;
    }

    this.processing.add(cacheKey);

    try {
      const definition = await this.findIdentifierDefinition(identifierName, fromFilePath);
      if (!definition) return null;

      const sourceCode = await readFile(definition.filePath, 'utf-8');
      const tree = this.parser.parse(sourceCode);

      const chunk = await this.extractCodeChunk(tree, identifierName, definition.filePath);
      if (!chunk) return null;

      const directDependencies = this.findChunkDependencies(tree, chunk.position);
      const resolvedDependencies = new Map<string, DependencyNode>();

      for (const depName of directDependencies) {
        if (
          depName === identifierName ||
          this.builtInIdentifiers.has(depName) ||
          this.isLocalIdentifier(depName, chunk)
        ) continue;

        const depNode = await this.analyzeIdentifierDependencies(depName, definition.filePath);
        if (depNode) {
          resolvedDependencies.set(depName, depNode);
        }
      }

      const result: DependencyNode = {
        identifier: identifierName,
        sourceCode: chunk.sourceCode,
        position: chunk.position,
        filePath: definition.filePath,
        dependencies: resolvedDependencies,
      };

      this.cache.set(cacheKey, result);
      return result;
    } finally {
      this.processing.delete(cacheKey);
    }
  }

  private findDefinitionInFile(tree: Parser.Tree, identifierName: string): SourcePosition | null {
    console.log('Finding definition for:', identifierName);

    const declarationTypes = new Set([
      'class_declaration',
      'abstract_class_declaration', 
      'interface_declaration',
      'type_alias_declaration',
      'function_declaration',
      'variable_declaration',
      'enum_declaration'
    ]);

    const isDeclaration = (type: string) => declarationTypes.has(type);

    for (const node of tree.rootNode.children) {
      if (node.type === 'export_statement') {
        const declaration = node.childForFieldName('declaration');
        if (declaration && isDeclaration(declaration.type)) {
          const nameNode = declaration.childForFieldName('name');
          if (nameNode?.text === identifierName) {
            return {
              start: { 
                line: node.startPosition.row,
                column: node.startPosition.column,
                offset: node.startIndex 
              },
              end: { 
                line: node.endPosition.row,
                column: node.endPosition.column,
                offset: node.endIndex 
              }
            };
          }
        }
      }
    }

    return null;
  }

  private isLocalIdentifier(name: string, chunk: { sourceCode: string }): boolean {
    // Check if the identifier is a local variable, parameter, or property
    const localPatterns = [
      `function ${name}`,
      `const ${name}`,
      `let ${name}`,
      `var ${name}`,
      `(${name}:`,
      `${name}:`,
      `private ${name}`,
      `protected ${name}`,
      `public ${name}`
    ];
    return localPatterns.some(pattern => chunk.sourceCode.includes(pattern));
  }

  async findIdentifierDefinition(
    identifierName: string,
    fromFilePath: string,
  ): Promise<{ filePath: string; position: SourcePosition } | null> {
    console.log('\nFinding definition for:', identifierName, 'in file:', fromFilePath);
  
    try {
      const sourceCode = await readFile(fromFilePath, 'utf-8');
      console.log('Source file content:', sourceCode);
  
      // Check for imports first
      const tree = this.parser.parse(sourceCode);
      const imports = this.findImportForIdentifier(tree, identifierName);
      console.log('Found imports:', imports);
  
      if (imports) {
        const resolvedPath = await this.resolveImportPath(imports.source, fromFilePath);
        console.log('Resolved import path:', resolvedPath);
  
        if (!resolvedPath) {
          console.log('Could not resolve import path');
          return null;
        }
  
        const importedCode = await readFile(resolvedPath, 'utf-8');
        console.log('Imported file content:', importedCode);
  
        const importedTree = this.parser.parse(importedCode);
        const position = this.findDefinitionInFile(importedTree, identifierName);
        console.log('Found position in imported file:', position);
  
        if (!position) {
          console.log('No definition found in imported file');
          return null;
        }
  
        return {
          filePath: resolvedPath,
          position,
        };
      } else {
        console.log('No imports found, searching in current file');
        // If no import found, check current file
        const position = this.findDefinitionInFile(tree, identifierName);
        if (position) {
          console.log('Found definition in current file:', position);
          return {
            filePath: fromFilePath,
            position,
          };
        }
      }
  
      console.log('No definition found');
      return null;
    } catch (error) {
      console.error('Error in findIdentifierDefinition:', error);
      return null;
    }
  }
  
  private findImportForIdentifier(
    tree: Parser.Tree,
    targetIdentifier: string,
  ): { source: string } | null {
    console.log('\nLooking for imports of:', targetIdentifier);
  
    for (const importStmt of tree.rootNode.descendantsOfType('import_statement')) {
      console.log('Checking import statement:', importStmt.text);
  
      // Check named imports
      const namedImports = importStmt.descendantsOfType('import_specifier');
      console.log('Named imports:', namedImports.map(spec => spec.text));
  
      for (const specifier of namedImports) {
        const importedName = specifier.descendantsOfType('identifier')[0]?.text;
        console.log('Checking import specifier:', importedName);
        if (importedName === targetIdentifier) {
          const sourceNode = importStmt.descendantsOfType('string')[0];
          if (sourceNode) {
            // Remove quotes from string
            const source = sourceNode.text.slice(1, -1);
            console.log('Found source for import:', source);
            return { source };
          }
        }
      }
  
      // Check type imports
      if (importStmt.text.includes('type')) {
        console.log('Found type import');
        const typeImports = importStmt.descendantsOfType('import_specifier');
        for (const specifier of typeImports) {
          const importedName = specifier.descendantsOfType('identifier')[0]?.text;
          console.log('Checking type import:', importedName);
          if (importedName === targetIdentifier) {
            const sourceNode = importStmt.descendantsOfType('string')[0];
            if (sourceNode) {
              const source = sourceNode.text.slice(1, -1);
              console.log('Found source for type import:', source);
              return { source };
            }
          }
        }
      }
  
      // Check namespace imports
      const namespaceImport = importStmt.descendantsOfType('namespace_import')[0];
      if (namespaceImport) {
        const name = namespaceImport.childForFieldName('name')?.text;
        console.log('Checking namespace import:', name);
        if (name === targetIdentifier) {
          const sourceNode = importStmt.descendantsOfType('string')[0];
          if (sourceNode) {
            const source = sourceNode.text.slice(1, -1);
            console.log('Found source for namespace import:', source);
            return { source };
          }
        }
      }
    }
  
    console.log('No matching import found');
    return null;
  }

  private async resolveImportPath(
    importPath: string,
    fromFilePath: string,
  ): Promise<string | null> {
    console.log('\nResolving import path:', importPath, 'from:', fromFilePath);

    try {
      if (importPath.startsWith('.')) {
        const extensions = ['.ts', '.tsx', '.js', '.jsx'];
        const basePath = path.resolve(path.dirname(fromFilePath), importPath);

        console.log('Base path:', basePath);

        // First try with exact path if it has extension
        if (path.extname(importPath)) {
          if (await this.fileExists(basePath)) {
            return basePath;
          }
        }

        // Try adding extensions directly
        for (const ext of extensions) {
          const fullPath = basePath + ext;
          console.log('Trying path:', fullPath);

          if (await this.fileExists(fullPath)) {
            console.log('Found existing file:', fullPath);
            return fullPath;
          }
        }

        // Try index files in directory
        for (const ext of extensions) {
          const indexPath = path.join(basePath, `index${ext}`);
          console.log('Trying index path:', indexPath);

          if (await this.fileExists(indexPath)) {
            console.log('Found existing index file:', indexPath);
            return indexPath;
          }
        }

        console.log('No valid file found with any extension');
        return null;
      } else {
        // node_modules import
        return await this.findInNodeModules(importPath, fromFilePath);
      }
    } catch (error) {
      console.error('Error in resolveImportPath:', error);
      return null;
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await import('fs').then((fs) => fs.promises.access(filePath));
      return true;
    } catch {
      return false;
    }
  }

  private async findInNodeModules(
    importPath: string,
    fromFilePath: string,
  ): Promise<string | null> {
    // Start from the directory containing fromFilePath
    let currentDir = path.dirname(fromFilePath);

    while (currentDir !== path.parse(currentDir).root) {
      const nodeModulesPath = path.join(currentDir, 'node_modules', importPath);

      try {
        const stats = await import('fs').then((fs) => fs.promises.stat(nodeModulesPath));
        if (stats.isFile()) {
          return nodeModulesPath;
        }

        // Check for package.json main field
        const packageJsonPath = path.join(path.dirname(nodeModulesPath), 'package.json');
        const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'));

        if (packageJson.main) {
          const mainPath = path.join(path.dirname(nodeModulesPath), packageJson.main);
          return mainPath;
        }
      } catch {
        // Move up to parent directory
        currentDir = path.dirname(currentDir);
        continue;
      }
    }

    return null;
  }

  async extractCodeChunk(
    tree: Parser.Tree,
    identifier: string,
    filePath: string,
  ): Promise<{ sourceCode: string; position: SourcePosition } | null> {
    console.log('\nExtracting code chunk for:', identifier);
    console.log('From file:', filePath);
  
    const fileContent = await readFile(filePath, 'utf-8');
    console.log('File content:', fileContent);
  
    const findNode = (node: Parser.SyntaxNode): Parser.SyntaxNode | null => {
      console.log('Visiting node:', node.type, node.text.slice(0, 50) + '...');
  
      if (node.type === 'export_statement') {
        const declaration = node.childForFieldName('declaration');
        console.log('Export declaration type:', declaration?.type);
  
        const nameNode = declaration?.childForFieldName('name');
        const declaratorNode = declaration?.descendantsOfType('variable_declarator')[0];
        
        const foundName = nameNode?.text || declaratorNode?.childForFieldName('name')?.text;
        console.log('Found name:', foundName);
  
        if (foundName === identifier) {
          console.log('Found matching declaration:', node.text);
          return node;
        }
      }
  
      for (const child of node.children) {
        const result = findNode(child);
        if (result) return result;
      }
  
      return null;
    };
  
    const foundNode = findNode(tree.rootNode);
    if (!foundNode) {
      console.log('No declaration found for:', identifier);
      return null;
    }
  
    console.log('Found declaration node:', {
      type: foundNode.type,
      startIndex: foundNode.startIndex,
      endIndex: foundNode.endIndex,
      text: foundNode.text.slice(0, 50)
    });
  
    return {
      sourceCode: fileContent.substring(foundNode.startIndex, foundNode.endIndex),
      position: {
        start: {
          line: foundNode.startPosition.row,
          column: foundNode.startPosition.column,
          offset: foundNode.startIndex,
        },
        end: {
          line: foundNode.endPosition.row,
          column: foundNode.endPosition.column,
          offset: foundNode.endIndex,
        },
      },
    };
  }

  findChunkDependencies(tree: Parser.Tree, position: SourcePosition): Set<string> {
    console.log('\nStarting findChunkDependencies for position:', position);
    const dependencies = new Set<string>();
    const typeParameters = new Set<string>();
    const localIdentifiers = new Set<string>();
    const localTypes = new Set<string>();
  
    // Collect all imports
    console.log('\nCollecting imports:');
    const importedNames = new Map<string, 'named' | 'namespace'>();
    
    for (const importStmt of tree.rootNode.descendantsOfType('import_statement')) {
      const namespaceImports = importStmt.descendantsOfType('namespace_import');
      for (const nsImport of namespaceImports) {
        const name = nsImport.descendantsOfType('identifier')[0]?.text;
        if (name) {
          importedNames.set(name, 'namespace');
          console.log('Found namespace import:', name);
        }
      }
  
      const namedImports = importStmt.descendantsOfType('import_specifier');
      for (const namedImport of namedImports) {
        const name = namedImport.descendantsOfType('identifier')[0]?.text;
        if (name) {
          importedNames.set(name, 'named');
          console.log('Found named import:', name);
        }
      }
    }
  
    // Collect all type definitions in the file
    console.log('\nCollecting type definitions:');
    for (const node of tree.rootNode.children) {
      if (
        node.type === 'class_declaration' ||
        node.type === 'interface_declaration' ||
        node.type === 'type_alias_declaration'
      ) {
        const name = node.childForFieldName('name')?.text;
        if (name) {
          localTypes.add(name);
          console.log('Found type definition:', name);
        }
      }
      if (node.type === 'export_statement') {
        const declaration = node.childForFieldName('declaration');
        if (declaration) {
          const name = declaration.childForFieldName('name')?.text;
          if (name) {
            localTypes.add(name);
            console.log('Found exported type definition:', name);
          }
        }
      }
    }
  
    // Find the target node based on position
    console.log('\nFinding target node...');
    const findTargetNode = (node: Parser.SyntaxNode): Parser.SyntaxNode | null => {
      if (node.startIndex === position.start.offset && node.endIndex === position.end.offset) {
        console.log('Found target node:', node.type);
        return node;
      }
      for (const child of node.children) {
        const result = findTargetNode(child);
        if (result) return result;
      }
      return null;
    };
  
    const targetNode = findTargetNode(tree.rootNode);
    if (!targetNode) return dependencies;
  
    // Get the declaration node
    const declarationNode = targetNode.type === 'export_statement' 
      ? targetNode.childForFieldName('declaration')
      : targetNode;
  
    // Get main declaration name
    console.log('\nExtracting main declaration name:');
    const mainDeclarationName = declarationNode?.childForFieldName('name')?.text;
    console.log('Main declaration name:', mainDeclarationName);
  
    // Collect class members
    console.log('\nCollecting class members:');
    declarationNode?.descendantsOfType('property_identifier').forEach(node => {
      if (node.parent?.type === 'method_definition' || 
          node.parent?.type === 'public_field_definition') {
        localIdentifiers.add(node.text);
        console.log('Found class member:', node.text);
      }
    });
  
    console.log('\nCollecting type parameters:');
    declarationNode?.descendantsOfType('type_parameter').forEach(param => {
      const name = param.childForFieldName('name');
      if (name) {
        typeParameters.add(name.text);
        console.log('Found type parameter:', name.text);
      }
    });
  
    // Collect dependencies
    console.log('\nCollecting dependencies:');
    const processNode = (node: Parser.SyntaxNode) => {
      if (node.type === 'type_identifier' || node.type === 'identifier') {
        const name = node.text;
        const importType = importedNames.get(name);
        const isLocalType = localTypes.has(name);
  
        console.log('Checking identifier:', name, 
          '\n  parent type:', node.parent?.type,
          '\n  import type:', importType,
          '\n  isLocalType:', isLocalType);
  
        // Skip built-ins, locals, etc.
        if (
          this.builtInIdentifiers.has(name) ||
          typeParameters.has(name) ||
          localIdentifiers.has(name) ||
          name === mainDeclarationName ||
          node.parent?.type === 'property_identifier' ||
          node.parent?.type === 'method_definition'
        ) {
          console.log('Skipping:', name, '(local/built-in)');
          return;
        }
  
        // Include if:
        // 1. It's a namespace import or used in namespace context
        const isNamespaceUsage = 
          importType === 'namespace' || 
          (node.parent?.type === 'member_expression' && importedNames.has(name));
  
        // 2. It's a type reference (imported or local)
        const isTypeUsage = 
          importType === 'named' ||
          isLocalType ||
          node.type === 'type_identifier' ||
          node.parent?.type === 'type_annotation' ||
          node.parent?.type === 'extends_clause' ||
          node.parent?.type === 'implements_clause' ||
          node.parent?.type === 'constraint' ||
          node.parent?.type === 'new_expression';  // Include types used in new expressions
  
        if (isNamespaceUsage || isTypeUsage) {
          console.log('Adding dependency:', name, 
            isNamespaceUsage ? '(namespace)' : '(type)');
          dependencies.add(name);
        }
      }
  
      node.children.forEach(processNode);
    };
  
    processNode(declarationNode || targetNode);
  
    console.log('\nFinal dependencies:', [...dependencies]);
    return dependencies;
  }
}

export { ASTDependencyAnalyzer, DependencyNode, SourcePosition };
