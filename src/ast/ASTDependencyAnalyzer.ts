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
    try {
      const sourceCode = await readFile(fromFilePath, 'utf-8');
      const tree = this.parser.parse(sourceCode);

      // First check if identifier is defined in current file
      const localDefinition = this.findDefinitionInFile(tree, identifierName);
      if (localDefinition) {
        return {
          filePath: fromFilePath,
          position: localDefinition,
        };
      }

      // If not found locally, look for imports
      const importInfo = this.findImportForIdentifier(tree, identifierName);
      if (!importInfo) return null;

      const resolvedPath = await this.resolveImportPath(importInfo.source, fromFilePath);
      if (!resolvedPath) return null;

      const importedCode = await readFile(resolvedPath, 'utf-8');
      const importedTree = this.parser.parse(importedCode);

      const position = this.findDefinitionInFile(importedTree, identifierName);
      if (!position) return null;

      return {
        filePath: resolvedPath,
        position,
      };
    } catch (error) {
      console.error('Error in findIdentifierDefinition:', error);
      return null;
    }
  }

  private findImportForIdentifier(
    tree: Parser.Tree,
    targetIdentifier: string,
  ): { source: string } | null {
    // This function finds the import statement that brings in the target identifier
    // Returns the source path if found, null otherwise
    
    const importStatements = tree.rootNode.descendantsOfType('import_statement');
    
    for (const importStmt of importStatements) {
      // Handle named imports: import { X } from 'path'
      const namedImports = importStmt.descendantsOfType('import_specifier');
      const matchingImport = namedImports.find(specifier => {
        const importedName = specifier.descendantsOfType('identifier')[0]?.text;
        return importedName === targetIdentifier;
      });

      if (matchingImport) {
        const sourcePath = importStmt.descendantsOfType('string')[0]?.text;
        return sourcePath ? { source: sourcePath.slice(1, -1) } : null;
      }

      // Handle namespace imports: import * as X from 'path'
      const namespaceImport = importStmt.descendantsOfType('namespace_import')[0];
      if (namespaceImport?.childForFieldName('name')?.text === targetIdentifier) {
        const sourcePath = importStmt.descendantsOfType('string')[0]?.text;
        return sourcePath ? { source: sourcePath.slice(1, -1) } : null;
      }

      // Handle default imports: import X from 'path'
      const defaultImport = importStmt.childForFieldName('clause')?.childForFieldName('default');
      if (defaultImport?.text === targetIdentifier) {
        const sourcePath = importStmt.descendantsOfType('string')[0]?.text;
        return sourcePath ? { source: sourcePath.slice(1, -1) } : null;
      }
    }

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
    const fileContent = await readFile(filePath, 'utf-8');

    for (const node of tree.rootNode.children) {
      if (node.type === 'export_statement') {
        const declaration = node.childForFieldName('declaration');
        if (!declaration) continue;

        const nameNode = declaration.childForFieldName('name');
        if (nameNode?.text === identifier) {
          return {
            sourceCode: fileContent.substring(node.startIndex, node.endIndex),
            position: {
              start: {
                line: node.startPosition.row,
                column: node.startPosition.column,
                offset: node.startIndex,
              },
              end: {
                line: node.endPosition.row,
                column: node.endPosition.column,
                offset: node.endIndex,
              },
            },
          };
        }
      }
    }

    return null;
  }

  findChunkDependencies(tree: Parser.Tree, position: SourcePosition): Set<string> {
    const dependencies = new Set<string>();
    const typeParameters = new Set<string>();
    let mainDeclarationName: string | null = null;

    const collectTypeParams = (node: Parser.SyntaxNode) => {
      if (node.type === 'type_parameters') {
        for (const param of node.children) {
          if (param.type === 'type_parameter') {
            const name = param.childForFieldName('name');
            if (name) typeParameters.add(name.text);
          }
        }
      }
      node.children.forEach(collectTypeParams);
    };

    for (const node of tree.rootNode.children) {
      collectTypeParams(node);

      if (node.type === 'export_statement') {
        const declaration = node.childForFieldName('declaration');
        if (declaration) {
          const nameNode = declaration.childForFieldName('name');
          if (nameNode) mainDeclarationName = nameNode.text;

          const traverseForDependencies = (n: Parser.SyntaxNode) => {
            if (
              (n.type === 'type_identifier' || n.type === 'identifier') &&
              !this.builtInIdentifiers.has(n.text) &&
              !typeParameters.has(n.text) &&
              n.text !== mainDeclarationName
            ) {
              dependencies.add(n.text);
            }
            n.children.forEach(traverseForDependencies);
          };

          traverseForDependencies(declaration);
        }
      }
    }

    return dependencies;
  }
}

export { ASTDependencyAnalyzer, DependencyNode, SourcePosition };
