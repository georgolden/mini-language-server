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
  
      const tree = this.parser.parse(sourceCode);
      
      // Check for imports first
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
  
        // For namespace imports, we want to return the module itself
        const namespaceImport = tree.rootNode.descendantsOfType('namespace_import')
          .find(ni => ni.descendantsOfType('identifier')[0]?.text === identifierName);

        if (namespaceImport) {
          console.log('Found namespace import, returning module path:', resolvedPath);
          return {
            filePath: resolvedPath,
            position: {
              start: { 
                line: 0,
                column: 0,
                offset: 0 
              },
              end: { 
                line: importedCode.split('\n').length - 1,
                column: importedCode.split('\n').slice(-1)[0]?.length || 0,
                offset: importedCode.length
              }
            }
          };
        }
  
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
  
  private async resolveImportPath(
    importPath: string,
    fromFilePath: string,
  ): Promise<string | null> {
    console.log('\nResolving import path:', importPath, 'from:', fromFilePath);

    try {
      if (importPath.startsWith('.')) {
        const extensions = ['.ts', '.tsx', '.js', '.jsx'];
        let basePath: string;
        
        if (importPath.endsWith('.js')) {
          // Handle ESM style imports (.js -> .ts/.tsx)
          basePath = path.resolve(
            path.dirname(fromFilePath), 
            importPath.slice(0, -3) // Remove .js extension
          );
        } else if (importPath.endsWith('.ts') || importPath.endsWith('.tsx')) {
          // Handle explicit typescript imports
          basePath = path.resolve(path.dirname(fromFilePath), importPath);
          // First try exact path for explicit extensions
          if (await this.fileExists(basePath)) {
            console.log('Found existing file with explicit extension:', basePath);
            return basePath;
          }
        } else {
          // No extension specified
          basePath = path.resolve(path.dirname(fromFilePath), importPath);
        }

        console.log('Base path:', basePath);

        // Try adding extensions
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
        // For non-relative imports (e.g. 'react', node_modules)
        return await this.findInNodeModules(importPath, fromFilePath);
      }
    } catch (error) {
      console.error('Error in resolveImportPath:', error);
      return null;
    }
  }

  private findDefinitionInFile(tree: Parser.Tree, identifierName: string): SourcePosition | null {
    console.log('Finding definition for:', identifierName);

    // First check for namespace imports
    for (const importStmt of tree.rootNode.descendantsOfType('import_statement')) {
      const namespaceImport = importStmt.descendantsOfType('namespace_import')[0];
      if (namespaceImport) {
        const identifier = namespaceImport.descendantsOfType('identifier')[0];
        if (identifier?.text === identifierName) {
          // Return the position of the entire import statement
          return {
            start: { 
              line: importStmt.startPosition.row,
              column: importStmt.startPosition.column,
              offset: importStmt.startIndex 
            },
            end: { 
              line: importStmt.endPosition.row,
              column: importStmt.endPosition.column,
              offset: importStmt.endIndex 
            }
          };
        }
      }
    }

    const findInNode = (node: Parser.SyntaxNode): SourcePosition | null => {
      // Handle export statements
      if (node.type === 'export_statement') {
        const declaration = node.childForFieldName('declaration');
        
        // Handle exported const/var declarations
        if (declaration?.type === 'lexical_declaration' || declaration?.type === 'variable_declaration') {
          const declarator = declaration.descendantsOfType('variable_declarator')[0];
          const name = declarator?.childForFieldName('name')?.text;
          if (name === identifierName) {
            return this.createPosition(node);
          }
        }
        
        // Handle other declarations (class, interface, etc.)
        if (declaration) {
          const nameNode = declaration.childForFieldName('name');
          if (nameNode?.text === identifierName) {
            return this.createPosition(node);
          }
        }
      }

      // Handle non-exported interfaces, classes, etc.
      if (['interface_declaration', 'class_declaration', 'type_alias_declaration'].includes(node.type)) {
        const nameNode = node.childForFieldName('name');
        if (nameNode?.text === identifierName) {
          return this.createPosition(node);
        }
      }

      // Handle const/let/var declarations
      if (node.type === 'lexical_declaration' || node.type === 'variable_declaration') {
        const declarator = node.descendantsOfType('variable_declarator')[0];
        const name = declarator?.childForFieldName('name')?.text;
        if (name === identifierName) {
          return this.createPosition(node);
        }
      }

      // Recursively check children
      for (const child of node.children) {
        const result = findInNode(child);
        if (result) return result;
      }

      return null;
    };

    return findInNode(tree.rootNode);
  }

  private createPosition(node: Parser.SyntaxNode): SourcePosition {
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

  private findImportForIdentifier(
    tree: Parser.Tree,
    targetIdentifier: string,
  ): { source: string } | null {
    console.log('\nLooking for imports of:', targetIdentifier);
  
    for (const importStmt of tree.rootNode.descendantsOfType('import_statement')) {
      console.log('Checking import statement:', importStmt.text);
  
      // Check namespace imports
      const namespaceImport = importStmt.descendantsOfType('namespace_import')[0];
      if (namespaceImport) {
        console.log('Checking namespace import:', namespaceImport.text);
        const identifier = namespaceImport.descendantsOfType('identifier')[0];
        if (identifier?.text === targetIdentifier) {
          const sourceNode = importStmt.descendantsOfType('string')[0];
          if (sourceNode) {
            const source = sourceNode.text.slice(1, -1);
            console.log('Found source for namespace import:', source);
            return { source };
          }
        }
      }

      // Check named imports
      const namedImports = importStmt.descendantsOfType('import_specifier');
      console.log('Named imports:', namedImports.map(spec => spec.text));
  
      for (const specifier of namedImports) {
        const importedName = specifier.descendantsOfType('identifier')[0]?.text;
        console.log('Checking import specifier:', importedName);
        if (importedName === targetIdentifier) {
          const sourceNode = importStmt.descendantsOfType('string')[0];
          if (sourceNode) {
            const source = sourceNode.text.slice(1, -1);
            console.log('Found source for import:', source);
            return { source };
          }
        }
      }
    }
  
    console.log('No matching import found');
    return null;
  }

  findChunkDependencies(tree: Parser.Tree, position: SourcePosition): Set<string> {
    console.log('\nStarting findChunkDependencies for position:', position);
    const dependencies = new Set<string>();
    const typeParameters = new Set<string>();
    const localIdentifiers = new Set<string>();
    const localTypes = new Set<string>();
  
    // Collect imports
    console.log('\nCollecting imports:');
    const importedNames = new Map<string, 'named' | 'namespace'>();
    
    for (const importStmt of tree.rootNode.descendantsOfType('import_statement')) {
      const namespaceImport = importStmt.descendantsOfType('namespace_import')[0];
      if (namespaceImport) {
        const identifier = namespaceImport.descendantsOfType('identifier')[0];
        const name = identifier?.text;
        if (name) {
          importedNames.set(name, 'namespace');
          dependencies.add(name); // Add namespace imports by default
          console.log('Found namespace import:', name);
        }
      }
  
      const namedImports = importStmt.descendantsOfType('import_specifier');
      for (const namedImport of namedImports) {
        const name = namedImport.descendantsOfType('identifier')[0]?.text;
        if (name && !name.startsWith('type ')) {
          importedNames.set(name, 'named');
          dependencies.add(name); // Add named imports by default
          console.log('Found named import:', name);
        }
      }
    }
  
    // Collect type definitions
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
      const name = param.childForFieldName('name')?.text;
      if (name) {
        typeParameters.add(name);
        console.log('Found type parameter:', name);
      }
    });
  
    // Process node for dependencies, with special handling for namespace usage
    const processNode = (node: Parser.SyntaxNode) => {
      // Check for namespace usage in member expressions
      if (node.type === 'member_expression') {
        const object = node.childForFieldName('object');
        if (object && importedNames.get(object.text) === 'namespace') {
          console.log('Found namespace usage:', object.text);
          dependencies.add(object.text);
          return;
        }
      }

      if (node.type === 'type_identifier' || node.type === 'identifier') {
        const name = node.text;
        const importType = importedNames.get(name);
        const isLocalType = localTypes.has(name);

        // For identifiers that are imports, add them
        if (importType) {
          dependencies.add(name);
          return;
        }

        // Skip built-ins and locals
        if (
          this.builtInIdentifiers.has(name) ||
          typeParameters.has(name) ||
          localIdentifiers.has(name) ||
          name === mainDeclarationName
        ) {
          return;
        }

        // Add local types and type references
        if (
          isLocalType ||
          node.type === 'type_identifier' ||
          node.parent?.type === 'type_annotation' ||
          node.parent?.type === 'extends_clause' ||
          node.parent?.type === 'implements_clause' ||
          node.parent?.type === 'constraint' ||
          node.parent?.type === 'new_expression'
        ) {
          dependencies.add(name);
        }

        if (node.parent?.type === 'member_expression') {
          const parentExpr = node.parent;
          if (node === parentExpr.childForFieldName('property')) {
            const object = parentExpr.childForFieldName('object');
            if (object && importedNames.get(object.text) === 'namespace') {
              dependencies.add(name);
            }
          }
        }
      }

      node.children.forEach(processNode);
    };

    processNode(declarationNode || targetNode);
  
    console.log('\nFinal dependencies:', [...dependencies]);
    return dependencies;
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
  
    const position = this.findDefinitionInFile(tree, identifier);
    if (!position) {
      console.log('No declaration found for:', identifier);
      return null;
    }

    console.log('Found matching declaration:', fileContent.substring(
      position.start.offset,
      position.end.offset
    ));

    return {
      sourceCode: fileContent.substring(position.start.offset, position.end.offset),
      position
    };
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

}

export { ASTDependencyAnalyzer, DependencyNode, SourcePosition };
